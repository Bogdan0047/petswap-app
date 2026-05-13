import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { estimateMiles, haversineMiles, type RadiusMiles } from '@/lib/distance';

export interface NearbyHelper {
  id: string;
  first_name: string | null;
  area: string | null;
  postcode: string | null;
  avatar_url: string | null;
  bio: string | null;
  trust_score: number;
  trust_tier: string;
  average_rating: number;
  total_reviews: number;
  completed_swaps: number;
  response_rate: number;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_location_verified?: boolean;
  is_pet_owner_verified?: boolean;
  available_now: boolean;
  last_seen_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Estimated miles from the current user. `null` when we can't estimate. */
  distanceMiles: number | null;
  /** True when distance is a postcode-prefix estimate (not real GPS). */
  distanceApprox?: boolean;
}

interface Options {
  /** Current user's postcode — used as a fallback when GPS coords are not available. */
  myPostcode: string | null | undefined;
  /** Current user's GPS coords — preferred over postcode for accurate distance. */
  myCoords?: { lat: number; lng: number } | null;
  /** Current user id — excluded from results. */
  myUserId: string | null | undefined;
  radius: RadiusMiles;
  limit?: number;
  /** Block list applied client-side. */
  blockedIds?: string[];
}

/**
 * Real, non-demo helpers from the database. RLS already excludes demo
 * profiles for the authenticated read policy; we additionally exclude the
 * caller and any locally blocked users, then filter by the radius using the
 * lightweight postcode-prefix estimator (no fake distances).
 */
export const useNearbyHelpers = ({ myPostcode, myCoords, myUserId, radius, limit = 24, blockedIds = [] }: Options) => {
  const [rows, setRows] = useState<NearbyHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id,first_name,area,postcode,avatar_url,bio,trust_score,trust_tier,average_rating,total_reviews,completed_swaps,response_rate,is_email_verified,is_phone_verified,is_location_verified,is_pet_owner_verified,available_now,last_seen_at,latitude,longitude',
        )
        .order('trust_score', { ascending: false })
        .limit(limit * 2);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as NearbyHelper[]);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const filtered = useMemo<NearbyHelper[]>(() => {
    const haveGps = !!myCoords;
    if (import.meta.env.DEV && haveGps) console.log('Using GPS distance', myCoords);

    const result = rows
      .filter((r) => r.id !== myUserId)
      .filter((r) => !blockedIds.includes(r.id))
      .map((r) => {
        // Per-pair best-available distance:
        // 1) Both have GPS → Haversine.
        // 2) Either side missing GPS but both have postcodes → postcode estimate.
        // 3) Otherwise → unknown (null) — still kept, just ranked last.
        let distanceMiles: number | null = null;
        let distanceApprox = false;
        const theirGps = r.latitude != null && r.longitude != null;
        if (haveGps && theirGps) {
          distanceMiles = haversineMiles(myCoords!, { lat: r.latitude!, lng: r.longitude! });
        } else if (myPostcode && r.postcode) {
          distanceMiles = estimateMiles(myPostcode, r.postcode);
          distanceApprox = true;
        }
        return { ...r, distanceMiles, distanceApprox };
      })
      .filter((r) => {
        if (radius === 0) return true;
        // Never exclude users just because we can't compute a distance —
        // include them so the screen isn't empty when GPS/postcode is missing.
        if (r.distanceMiles == null) return true;
        return r.distanceMiles <= radius;
      })
      // Anti-fake ranking: verified users first, then closer, then more recently active.
      .sort((a, b) => {
        const aVer = (a.is_email_verified ? 1 : 0) + (a.is_location_verified ? 1 : 0) + (a.is_pet_owner_verified ? 1 : 0) + (a.avatar_url ? 1 : 0);
        const bVer = (b.is_email_verified ? 1 : 0) + (b.is_location_verified ? 1 : 0) + (b.is_pet_owner_verified ? 1 : 0) + (b.avatar_url ? 1 : 0);
        if (aVer !== bVer) return bVer - aVer;
        const ad = a.distanceMiles ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceMiles ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        if (at !== bt) return bt - at;
        return (b.trust_score ?? 0) - (a.trust_score ?? 0);
      })
      .slice(0, limit);

    if (import.meta.env.DEV) console.log(`Helpers found: ${result.length}`);
    return result;
  }, [rows, myUserId, blockedIds, myPostcode, myCoords, radius, limit]);

  return { helpers: filtered, allHelpers: rows.filter((r) => r.id !== myUserId && !blockedIds.includes(r.id)), loading, error };
};
