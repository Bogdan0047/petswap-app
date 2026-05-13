import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  /** Browser geolocation, when granted. */
  coords: { lat: number; lng: number } | null;
  /** Saved postcode on the user's profile, if any. */
  postcode: string | null;
  /** True once we know whether we have a usable location. */
  ready: boolean;
  /** When true, neither geolocation nor a postcode is available. */
  needsLocation: boolean;
  /** Permission state for browser geolocation, when known. */
  permission: PermissionState | 'unsupported' | 'unknown';
  /** Imperative refresh — call after the user grants permission or saves a postcode. */
  refresh: () => void;
}

const STORAGE_KEY = 'petswap.geo.coords.v1';

const readCached = (): { lat: number; lng: number } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number; ts: number };
    if (Date.now() - parsed.ts > 1000 * 60 * 60 * 24) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch { return null; }
};

const writeCached = (c: { lat: number; lng: number }) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...c, ts: Date.now() })); }
  catch { /* ignore */ }
};

/**
 * Real geolocation only — no fake distances. Uses navigator.geolocation when
 * the user has granted it, otherwise falls back to the postcode saved on the
 * authenticated profile. Surface `needsLocation` to prompt the user.
 */
export const useUserLocation = (userId: string | null | undefined): UserLocation => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => readCached());
  const [postcode, setPostcode] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unsupported' | 'unknown'>('unknown');
  const [profileReady, setProfileReady] = useState(false);
  const [tick, setTick] = useState(0);

  // Postcode from profile.
  useEffect(() => {
    if (!userId) { setPostcode(null); setProfileReady(true); return; }
    let cancelled = false;
    supabase.from('profiles').select('postcode').eq('id', userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      setPostcode((data?.postcode ?? null) || null);
      setProfileReady(true);
    });
    return () => { cancelled = true; };
  }, [userId, tick]);

  // Browser geolocation — only request if permission is already granted, to avoid surprise prompts.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setPermission('unsupported');
      return;
    }
    let cancelled = false;
    const tryFetch = (state: PermissionState) => {
      setPermission(state);
      if (state !== 'granted') return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(next);
          writeCached(next);
          // Persist GPS + mark location_verified once on the user's profile.
          if (userId) {
            void supabase
              .from('profiles')
              .update({
                latitude: next.lat,
                longitude: next.lng,
                is_location_verified: true,
                location_verified_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
        },
        () => { /* swallow — fallback to postcode */ },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 * 5 },
      );
    };
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((res) => tryFetch(res.state))
        .catch(() => setPermission('unknown'));
    } else {
      tryFetch('prompt' as PermissionState);
    }
    return () => { cancelled = true; };
  }, [tick, userId]);

  return {
    coords,
    postcode,
    ready: profileReady,
    needsLocation: profileReady && !coords && !postcode,
    permission,
    refresh: () => setTick((t) => t + 1),
  };
};
