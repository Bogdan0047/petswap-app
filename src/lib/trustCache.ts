import type { TrustProfile } from '@/hooks/useTrustProfile';

const KEY = 'petswap.trust.v1';
const TTL_MS = 5 * 60 * 1000; // 5 minutes — fresh enough, but instant paint

interface CacheEntry {
  userId: string;
  data: TrustProfile;
  savedAt: number;
}

/** Read cached trust profile for a user. Returns null when missing or stale. */
export const readTrustCache = (userId: string): TrustProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.data || parsed.userId !== userId) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

/** Persist trust profile so the next session paints instantly. */
export const writeTrustCache = (userId: string, data: TrustProfile) => {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { userId, data, savedAt: Date.now() };
    window.localStorage.setItem(`${KEY}:${userId}`, JSON.stringify(entry));
  } catch {
    /* quota or private mode — ignore */
  }
};
