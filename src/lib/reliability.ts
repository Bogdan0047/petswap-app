import type { User } from '@/data/mockData';

/**
 * Community Reliability Streak — a calm, mature alternative to childish
 * streaks. Rewards consecutive successful swaps with NO cancellations.
 *
 * Tiers reflect milestones the community recognises (3 / 7 / 15 / 30).
 */

export interface ReliabilityStreak {
  /** Effective reliability streak length (capped to completed swaps). */
  streak: number;
  /** Tier label e.g. "Trusted Streak", "Community Pillar". */
  label: string;
  /** Tier progress 0-1 toward next milestone. */
  progress: number;
  /** Threshold of next milestone (or current if maxed). */
  nextMilestone: number;
  /** True if the user has any active streak (>=3). */
  earned: boolean;
}

const MILESTONES = [3, 7, 15, 30];

const labelFor = (streak: number): string => {
  if (streak >= 30) return 'Community Pillar';
  if (streak >= 15) return 'Trusted Streak';
  if (streak >= 7) return 'Reliable Helper';
  if (streak >= 3) return 'Rising Streak';
  return 'No streak yet';
};

export const computeReliabilityStreak = (user: Pick<User, 'completedSwaps' | 'cancellationsCount'>): ReliabilityStreak => {
  const cancellations = Math.max(user.cancellationsCount, 0);
  const completed = Math.max(user.completedSwaps, 0);
  // The streak is conservatively the completed swaps minus any cancellations.
  const streak = Math.max(completed - cancellations, 0);
  const next = MILESTONES.find(m => m > streak) ?? MILESTONES[MILESTONES.length - 1];
  const previous = [...MILESTONES].reverse().find(m => m <= streak) ?? 0;
  const span = Math.max(next - previous, 1);
  const progress = streak >= next ? 1 : Math.min(Math.max((streak - previous) / span, 0), 1);
  return {
    streak,
    label: labelFor(streak),
    progress,
    nextMilestone: next,
    earned: streak >= 3,
  };
};
