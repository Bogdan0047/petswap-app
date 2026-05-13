/**
 * Freshness ranking + availability segmentation.
 *
 * Ranks helpers/owners so the most "alive" candidates surface first:
 *   recently active, verified, high trust score, fast responders,
 *   available now/soon. Pure frontend over mock + light backend data.
 */
import type { User } from '@/data/mockData';
import { computeTrust } from '@/lib/trust';

export type AvailabilitySegment = 'now' | 'weekend' | 'next_week' | 'any';

export const AVAILABILITY_SEGMENTS: { value: AvailabilitySegment; label: string }[] = [
  { value: 'any', label: 'All' },
  { value: 'now', label: 'Available now' },
  { value: 'weekend', label: 'Weekend free' },
  { value: 'next_week', label: 'Next week' },
];

const ACTIVE_KEYWORDS = ['min', 'sec', 'now', 'just'];
const HOUR_KEYWORDS = ['hr', 'hour'];

/** Recency score 0-100 from the human-readable lastActive string. */
export const recencyScore = (lastActive?: string): number => {
  if (!lastActive) return 0;
  const v = lastActive.toLowerCase();
  if (ACTIVE_KEYWORDS.some(k => v.includes(k))) return 100;
  if (HOUR_KEYWORDS.some(k => v.includes(k))) {
    const n = parseInt(v, 10) || 1;
    if (n <= 3) return 85;
    if (n <= 12) return 65;
    return 45;
  }
  if (v.includes('day')) {
    const n = parseInt(v, 10) || 1;
    if (n <= 1) return 35;
    if (n <= 7) return 20;
    return 8;
  }
  return 5;
};

/** True if user appears active in the last few hours. */
export const isOnlineNow = (user: User): boolean => recencyScore(user.lastActive) >= 85;

const WEEKEND = ['Sat', 'Sun'];
const NEXT_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const matchesSegment = (user: User, segment: AvailabilitySegment): boolean => {
  if (segment === 'any') return true;
  if (segment === 'now') return isOnlineNow(user) && user.responseRate >= 80;
  const days = user.availability?.daysAvailable ?? [];
  if (segment === 'weekend') return WEEKEND.some(d => days.includes(d));
  if (segment === 'next_week') return NEXT_WEEK.some(d => days.includes(d));
  return true;
};

/**
 * Composite freshness score (0-100).
 *   trust 35 · recency 25 · response 15 · verified 15 · completed swaps 10
 */
export const freshnessScore = (user: User): number => {
  const trust = computeTrust(user).score; // 0-100
  const recency = recencyScore(user.lastActive); // 0-100
  const response = Math.min(100, user.responseRate); // 0-100
  const verified =
    (user.isEmailVerified ? 1 : 0) +
    (user.isPhoneVerified ? 1 : 0) +
    (user.isIdVerified ? 2 : 0); // 0-4
  const verifiedPct = (verified / 4) * 100;
  const swaps = Math.min(100, user.completedSwaps * 5); // 20+ swaps caps
  return Math.round(
    trust * 0.35 + recency * 0.25 + response * 0.15 + verifiedPct * 0.15 + swaps * 0.1,
  );
};

/** Sort helpers/owners by freshness score (descending). */
export const rankByFreshness = <T extends User>(users: T[]): T[] =>
  [...users].sort((a, b) => freshnessScore(b) - freshnessScore(a));

/** Parse "2 hours ago" / "3 days ago" / "30 min ago" to a sortable rank. */
export const requestRecencyRank = (createdAt: string): number => {
  const v = createdAt.toLowerCase();
  if (v.includes('min') || v.includes('sec')) return 1000;
  if (v.includes('hour') || v.includes('hr')) return 800 - (parseInt(v, 10) || 1);
  if (v.includes('day')) return 500 - (parseInt(v, 10) || 1) * 10;
  return 0;
};

/** Created today? Best-effort against humanized strings. */
export const isCreatedToday = (createdAt: string): boolean => {
  const v = createdAt.toLowerCase();
  return (
    v.includes('min') ||
    v.includes('sec') ||
    v.includes('hour') ||
    v.includes('hr') ||
    v === 'today'
  );
};
