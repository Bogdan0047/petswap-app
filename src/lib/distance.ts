/**
 * Lightweight UK postcode-prefix distance estimator.
 *
 * No GPS, no PostGIS — we approximate by whether the outward postcode
 * prefix matches the user's. Same prefix → very close. Same area letter
 * → close. Otherwise far.
 *
 * This is intentionally rough; it powers the radius-chip filter (1/5/10/25
 * miles) so users get a sensible "nearby" feel from existing profile data.
 */

export type RadiusMiles = 1 | 5 | 10 | 25 | 0;

export const RADIUS_OPTIONS: { value: RadiusMiles; label: string }[] = [
  { value: 1, label: '1 mi' },
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 25, label: '25 mi' },
  { value: 0, label: 'Any' },
];

/**
 * Real GPS distance between two coordinates using the Haversine formula.
 * Returns miles. Returns null if either coordinate pair is missing.
 */
export const haversineMiles = (
  a?: { lat: number; lng: number } | null,
  b?: { lat: number; lng: number } | null,
): number | null => {
  if (!a || !b) return null;
  if (
    !Number.isFinite(a.lat) || !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) || !Number.isFinite(b.lng)
  ) return null;
  const R = 3959; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const outward = (postcode?: string | null): string => {
  if (!postcode) return '';
  return postcode.trim().toUpperCase().split(' ')[0];
};

const areaLetters = (out: string): string => out.replace(/[0-9]/g, '');

/**
 * Estimate miles between two UK postcodes by prefix similarity.
 * Returns a coarse number used for both display and filtering.
 */
export const estimateMiles = (a?: string | null, b?: string | null): number => {
  const oa = outward(a);
  const ob = outward(b);
  if (!oa || !ob) return 99;
  if (oa === ob) return 0.5;
  if (areaLetters(oa) === areaLetters(ob)) return 4;
  // Adjacent London areas often share the first letter (N1 vs NW1)
  if (oa[0] === ob[0]) return 12;
  return 30;
};

/**
 * Friendly distance for cards. Shows 1 decimal under 10 mi, otherwise rounded.
 * Pass `approx: true` to prefix with "~" for postcode-prefix estimates.
 */
export const formatMiles = (miles: number, approx = false): string => {
  const prefix = approx ? '~' : '';
  if (miles < 0.1) return `${prefix}<0.1 mi away`;
  if (miles < 10) return `${prefix}${miles.toFixed(1)} mi away`;
  return `${prefix}${Math.round(miles)} mi away`;
};

export const isWithinRadius = (
  myPostcode: string | undefined | null,
  theirPostcode: string | undefined | null,
  radius: RadiusMiles,
): boolean => {
  if (radius === 0) return true;
  return estimateMiles(myPostcode, theirPostcode) <= radius;
};
