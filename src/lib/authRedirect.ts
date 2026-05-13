/** Production canonical origin for OAuth callbacks. */
const PROD_ORIGINS = new Set([
  "https://petswap.co.uk",
  "https://www.petswap.co.uk",
]);

export const getSafeAuthNext = (
  value: string | null | undefined,
  fallback = "/home",
) => {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
};

export const buildAuthRoute = (next: string) =>
  `/auth?next=${encodeURIComponent(getSafeAuthNext(next))}`;

/**
 * Build the OAuth redirect URI. Always uses the current window origin so we
 * stay on petswap.co.uk in production and the preview/custom-domain in dev —
 * never hardcode a lovable.dev URL here.
 */
export const buildOAuthRedirectUri = (origin: string, next: string) => {
  const safeNext = getSafeAuthNext(next);
  const base = PROD_ORIGINS.has(origin) || origin.endsWith(".lovable.app") || origin.startsWith("http://localhost")
    ? origin
    : origin;
  return `${base}/auth/callback?next=${encodeURIComponent(safeNext)}`;
};
