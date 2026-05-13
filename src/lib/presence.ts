import type { User } from '@/data/mockData';

/**
 * Parse human "lastActive" strings ("Now", "2 min ago", "1 hr ago", "3 days ago")
 * into minutes. Returns Number.MAX_SAFE_INTEGER for unknown formats so they
 * sort to the bottom in "most recent" ordering.
 */
export const lastActiveMinutes = (lastActive?: string): number => {
  if (!lastActive) return Number.MAX_SAFE_INTEGER;
  const s = lastActive.trim().toLowerCase();
  if (s === 'now' || s === 'just now' || s === 'online') return 0;
  const m = s.match(/(\d+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks)/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit.startsWith('min') || unit.startsWith('minute')) return n;
  if (unit.startsWith('hr') || unit.startsWith('hour')) return n * 60;
  if (unit.startsWith('day')) return n * 60 * 24;
  if (unit.startsWith('week')) return n * 60 * 24 * 7;
  return Number.MAX_SAFE_INTEGER;
};

/** Active in the last 10 minutes counts as "active now". */
export const isActiveNow = (u: Pick<User, 'lastActive'>): boolean =>
  lastActiveMinutes(u.lastActive) <= 10;

/**
 * Estimate a typical reply time from response rate. Mock data does not store
 * exact response time, so we derive a friendly bucket: high responders reply
 * within minutes, low responders within hours. Used for the "Replies in ~X" pill.
 */
export const estimateResponseTime = (responseRate: number): string => {
  if (responseRate >= 95) return '~5 min';
  if (responseRate >= 85) return '~15 min';
  if (responseRate >= 70) return '< 1 hr';
  if (responseRate >= 50) return '< 3 hrs';
  return '~1 day';
};

/** Parse miles from "0.4 mi" / "1.2 km" style strings. Falls back to Infinity. */
export const parseDistanceMiles = (distance?: string): number => {
  if (!distance) return Number.POSITIVE_INFINITY;
  const m = distance.match(/([\d.]+)/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
};
