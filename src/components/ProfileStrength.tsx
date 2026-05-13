import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileStrengthProps {
  pct: number;
  /** Steps already completed — rendered as ✔ at the top of the checklist. */
  doneSteps?: { label: string }[];
  /** Steps still to do — rendered as ⬜ below. */
  nextSteps?: { label: string }[];
  variant?: 'card' | 'inline';
  onAction?: () => void;
  className?: string;
}

/** Friendly trust-level label & emoji from completion %. Numbers stay subtle. */
const tierFromPct = (pct: number): { label: string; emoji: string; tone: string } => {
  if (pct >= 100) return { label: 'Fully trusted', emoji: '✨', tone: 'text-success' };
  if (pct >= 75) return { label: 'Trusted', emoji: '🌳', tone: 'text-success' };
  if (pct >= 40) return { label: 'Growing', emoji: '🌱', tone: 'text-primary' };
  return { label: 'Just starting', emoji: '🌱', tone: 'text-primary' };
};

const ProfileStrength = ({ pct, doneSteps = [], nextSteps = [], variant = 'inline', onAction, className }: ProfileStrengthProps) => {
  const isComplete = pct >= 100;
  const tier = tierFromPct(pct);

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-slow" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{pct}%</span>
      </div>
    );
  }

  return (
    <button
      onClick={onAction}
      disabled={isComplete}
      className={cn('card-elevated p-5 w-full text-left transition-all duration-fast active:scale-[0.99] disabled:active:scale-100', className)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-[20px] leading-none">
          <span aria-hidden>{tier.emoji}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[15px]">
            Trust level: <span className={tier.tone}>{tier.label}</span>
          </p>
          <p className="text-[12px] text-muted-foreground">
            {isComplete ? "You're a fully trusted member." : 'Complete a step to grow your trust.'}
          </p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full bg-primary rounded-full transition-all duration-slow" style={{ width: `${pct}%` }} />
      </div>
      {(doneSteps.length > 0 || nextSteps.length > 0) && (
        <div className="space-y-1.5 pt-1">
          {doneSteps.slice(0, 4).map((s) => (
            <div key={`done-${s.label}`} className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="w-4 h-4 rounded-full bg-success text-success-foreground flex items-center justify-center flex-shrink-0">
                <Check size={11} strokeWidth={3} />
              </span>
              <span className="line-through">{s.label}</span>
            </div>
          ))}
          {!isComplete && nextSteps.slice(0, 3).map((s) => (
            <div key={`todo-${s.label}`} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-[5px] bg-surface-muted ring-1 ring-border flex-shrink-0" />
                <span className="text-foreground">{s.label}</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

export default ProfileStrength;
