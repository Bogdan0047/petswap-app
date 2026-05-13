import { supabase } from '@/integrations/supabase/client';

/**
 * Activity-streak helpers.
 *
 * An "active day" is any day on which the user takes one of the engaged
 * actions: send a message, swipe on a match, confirm a booking, leave a
 * review. Calling `recordStreakActivity` is idempotent for a given UTC day.
 *
 * Fail-safe: NEVER throws — calling code can fire-and-forget.
 */

export type StreakActivity =
  | 'message_sent'
  | 'match_swipe'
  | 'booking_confirmed'
  | 'review_submitted';

export interface UserStreak {
  current_streak_days: number;
  longest_streak: number;
  last_activity_date: string | null;
  freezes_remaining: number;
}

const SESSION_KEY = 'petswap.streak.day';

/**
 * Record a streak activity for the current user. Skips an extra round-trip
 * when we've already recorded the same UTC day in this browser session.
 */
export async function recordStreakActivity(activity: StreakActivity): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached === today) return;
    const { error } = await supabase.rpc('record_streak_activity', { _activity: activity });
    if (!error) sessionStorage.setItem(SESSION_KEY, today);
  } catch (err) {
    // Never throw — streaks are an enhancement.
    console.warn('[streaks] record failed', err);
  }
}

/** Fetch the calling user's current streak. Returns null if signed out / new. */
export async function fetchMyStreak(): Promise<UserStreak | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak_days, longest_streak, last_activity_date, freezes_remaining')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

/** Returns label for a milestone tier — used on badge UI. */
export function streakTierLabel(streak: number): string {
  if (streak >= 30) return 'Daily Legend';
  if (streak >= 14) return 'Two-week Streak';
  if (streak >= 7) return 'Week Streak';
  if (streak >= 3) return 'Rising Streak';
  return 'Day 1';
}

/** Is today already counted? Drives the "keep your streak alive" prompt. */
export function streakActiveToday(s: UserStreak | null): boolean {
  if (!s?.last_activity_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return s.last_activity_date === today;
}
