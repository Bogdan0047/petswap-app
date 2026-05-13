import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Helper-leaning user → "earn this weekend" copy; otherwise → "find help" copy. */
  variant: 'owner' | 'helper';
  onCta: () => void;
  className?: string;
}

const isWeekendWindow = (): boolean => {
  // Show Thu(4), Fri(5), Sat(6) — peak demand build-up.
  const day = new Date().getDay();
  return day === 4 || day === 5 || day === 6;
};

/** Stable key per upcoming weekend so dismissal lasts only until next week. */
const weekendKey = (): string => {
  const d = new Date();
  // ISO week-year + week number is overkill; use the Saturday date as the bucket.
  const day = d.getDay();
  const daysUntilSat = (6 - day + 7) % 7;
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysUntilSat);
  return `petswap.weekendBanner.dismissed.${sat.toISOString().slice(0, 10)}`;
};

const WeekendMomentumBanner = ({ variant, onCta, className }: Props) => {
  const inWindow = useMemo(isWeekendWindow, []);
  const key = useMemo(weekendKey, []);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key) === '1');
    } catch {
      /* noop */
    }
  }, [key]);

  if (!inWindow || dismissed) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  const isHelperCopy = variant === 'helper';

  return (
    <button
      onClick={onCta}
      className={cn(
        'w-full p-4 rounded-lg text-left relative overflow-hidden transition-all duration-fast active:scale-[0.99]',
        'bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/15',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
          <CalendarDays size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              This weekend
            </span>
          </div>
          <p className="font-semibold text-[14px] leading-tight">
            {isHelperCopy
              ? 'Earn credits this weekend helping local owners'
              : 'Need help with your pet this weekend?'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
            {isHelperCopy
              ? 'Owners are looking for trusted helpers nearby.'
              : 'Trusted helpers are available near you.'}
            <ArrowRight size={12} />
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss weekend banner"
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      >
        <X size={13} />
      </button>
    </button>
  );
};

export default WeekendMomentumBanner;
