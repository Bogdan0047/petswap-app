import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { streakTierLabel, type UserStreak } from '@/lib/streaks';

interface Props {
  streak: UserStreak | null;
  variant?: 'pill' | 'card';
  className?: string;
}

/**
 * Calm streak badge. Mature, Apple-style — no childish flames stack.
 * - `pill`: tiny inline chip for use in headers / nav
 * - `card`: home/profile surface with milestone label
 */
const StreakBadge = ({ streak, variant = 'pill', className }: Props) => {
  if (!streak || streak.current_streak_days < 1) return null;
  const days = streak.current_streak_days;
  const label = streakTierLabel(days);

  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold',
          className,
        )}
      >
        <Flame size={11} className="-ml-0.5" />
        <span className="tabular-nums">{days}</span>
        <span>day{days === 1 ? '' : 's'}</span>
      </span>
    );
  }

  return (
    <div className={cn('card-elevated p-4 flex items-center gap-3', className)}>
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Flame size={20} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Activity streak
        </p>
        <p className="font-bold text-[15px] leading-tight mt-0.5">
          {label} · <span className="tabular-nums">{days}</span> day{days === 1 ? '' : 's'}
        </p>
        {streak.longest_streak > days && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Personal best: <span className="tabular-nums">{streak.longest_streak}</span> days
          </p>
        )}
      </div>
    </div>
  );
};

export default StreakBadge;
