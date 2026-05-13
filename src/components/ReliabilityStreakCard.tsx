import { Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReliabilityStreak } from '@/lib/reliability';

interface Props {
  streak: ReliabilityStreak;
  onAction?: () => void;
  className?: string;
}

/**
 * Calm reliability badge — only renders when the user has earned a streak
 * (>=3 completed swaps with no recent cancellations). Premium typography,
 * subtle progress meter to next milestone. No childish flourishes.
 */
const ReliabilityStreakCard = ({ streak, onAction, className }: Props) => {
  if (!streak.earned) return null;

  return (
    <button
      onClick={onAction}
      className={cn(
        'card-elevated p-5 w-full text-left transition-all duration-fast active:scale-[0.99]',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Award size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Community streak
          </p>
          <p className="font-bold text-[16px] leading-tight mt-0.5">{streak.label}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {streak.streak} successful swap{streak.streak === 1 ? '' : 's'} · no cancellations
          </p>
        </div>
        {onAction && <ChevronRight size={18} className="text-muted-foreground" />}
      </div>

      <div className="mt-4">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.round(streak.progress * 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {streak.streak >= streak.nextMilestone
            ? 'Top tier reached — thank you for showing up.'
            : `${streak.nextMilestone - streak.streak} swap${streak.nextMilestone - streak.streak === 1 ? '' : 's'} to next milestone`}
        </p>
      </div>
    </button>
  );
};

export default ReliabilityStreakCard;
