import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { estimateMiles, haversineMiles, type RadiusMiles } from '@/lib/distance';

export interface NearbyCareRequest {
  id: string;
  pet_id: string;
  creator_id: string;
  care_type: string;
  start_at: string;
  end_at: string;
  credits_offered: number;
  notes: string | null;
  location_area: string | null;
  status: string;
  created_at: string;
  creator: {
    id: string;
    first_name: string | null;
    avatar_url: string | null;
    postcode: string | null;
    area: string | null;
    trust_score: number;
    trust_tier: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  pet: {
    id: string;
    name: string;
    type: string;
    breed: string | null;
  } | null;
  distanceMiles: number | null;
}

interface Options {
  myPostcode: string | null | undefined;
  myCoords?: { lat: number; lng: number } | null;
  myUserId: string | null | undefined;
  radius: RadiusMiles;
  limit?: number;
  blockedIds?: string[];
  /** Include only requests I haven't created. Defaults to true. */
  excludeMine?: boolean;
}

/**
 * Real open care requests, joined with creator profile (non-demo only via RLS)
 * and pet basics. Distance is estimated client-side from the postcode prefix.
 */
export const useNearbyCareRequests = ({
  myPostcode,
  myCoords,
  myUserId,
  radius,
  limit = 30,
  blockedIds = [],
  excludeMine = true,
}: Options) => {
  const [rows, setRows] = useState<NearbyCareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('care_requests')
        .select(
          'id,pet_id,creator_id,care_type,start_at,end_at,credits_offered,notes,location_area,status,created_at,creator:profiles!care_requests_creator_id_fkey(id,first_name,avatar_url,postcode,area,trust_score,trust_tier,latitude,longitude),pet:pets!care_requests_pet_id_fkey(id,name,type,breed)',
        )
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      if (cancelled) return;
      if (error) {
        // Fallback without the FK alias if the join can't be resolved.
        const fb = await supabase
          .from('care_requests')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(limit * 2);
        if (fb.error) {
          setError(fb.error.message);
          setRows([]);
        } else {
          setRows(((fb.data ?? []) as Array<Record<string, unknown>>).map((r) => ({ ...r, creator: null, pet: null } as NearbyCareRequest)));
          setError(null);
        }
      } else {
        setRows((data ?? []) as unknown as NearbyCareRequest[]);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  const filtered = useMemo<NearbyCareRequest[]>(() => {
    return rows
      .filter((r) => (excludeMine ? r.creator_id !== myUserId : true))
      .filter((r) => !blockedIds.includes(r.creator_id))
      .map((r) => {
        // Per-pair best-available distance:
        // 1) Both have GPS → Haversine.
        // 2) Either side missing GPS but both have postcodes → postcode estimate.
        // 3) Otherwise → unknown (null) — still kept, just ranked last.
        let distanceMiles: number | null = null;
        const theirGps = r.creator?.latitude != null && r.creator?.longitude != null;
        if (myCoords && theirGps) {
          distanceMiles = haversineMiles(myCoords, { lat: r.creator!.latitude!, lng: r.creator!.longitude! });
        } else if (myPostcode && r.creator?.postcode) {
          distanceMiles = estimateMiles(myPostcode, r.creator.postcode);
        }
        return { ...r, distanceMiles };
      })
      .filter((r) => {
        if (radius === 0) return true;
        // Never exclude requests just because we can't compute a distance.
        if (r.distanceMiles == null) return true;
        return r.distanceMiles <= radius;
      })
      .sort((a, b) => {
        const ad = a.distanceMiles ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceMiles ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      })
      .slice(0, limit);
  }, [rows, myUserId, blockedIds, myPostcode, myCoords, radius, limit, excludeMine]);

  return { requests: filtered, loading, error };
};
