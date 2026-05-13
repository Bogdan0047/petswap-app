import { useState } from 'react';
import { ChevronDown, Check, Minus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  label: string;
  achieved: boolean;
}

interface Props {
  items: Item[];
  /** Pre-formatted score, e.g. 82 */
  score: number;
  /** When true, default to expanded */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * "Why this user is trusted" — expandable, Apple-clean breakdown of the
 * trust signals contributing to a score. Read-only, presentation only.
 */
const TrustBreakdownCard = ({ items, score, defaultOpen = false, className }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const achievedCount = items.filter((i) => i.achieved).length;

  return (
    <div className={cn('card-elevated overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14.5px] leading-tight">Why this profile is trusted</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {achievedCount} of {items.length} signals · score {score}/100
          </p>
        </div>
        <ChevronDown
          size={18}
          className={cn('text-muted-foreground transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 space-y-2 animate-fade-in">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 text-[13px] py-1.5 border-t border-border/60 first:border-t-0"
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  item.achieved
                    ? 'bg-success/15 text-success'
                    : 'bg-muted text-muted-foreground ring-1 ring-border',
                )}
              >
                {item.achieved ? <Check size={11} strokeWidth={3} /> : <Minus size={11} />}
              </span>
              <span className={item.achieved ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustBreakdownCard;
