import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  trustedNearbyCount: number;
  creditsBalance: number;
  onCta: () => void;
  className?: string;
}

const LAST_VISIT_KEY = 'petswap.lastVisitAt.v1';
const DISMISS_KEY = 'petswap.winback.dismissedAt.v1';

const dayMs = 24 * 60 * 60 * 1000;

const readNumber = (key: string): number | null => {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};

const DormantWinbackBanner = ({
  trustedNearbyCount,
  creditsBalance,
  onCta,
  className,
}: Props) => {
  const [daysAway, setDaysAway] = useState(0);
  const [dismissedRecently, setDismissedRecently] = useState(false);

  useEffect(() => {
    const last = readNumber(LAST_VISIT_KEY);
    const dismissedAt = readNumber(DISMISS_KEY);
    const now = Date.now();
    if (last) {
      setDaysAway(Math.floor((now - last) / dayMs));
    }
    // Don't keep showing the same banner more than once per 24h.
    if (dismissedAt && now - dismissedAt < dayMs) {
      setDismissedRecently(true);
    }
    // Stamp this visit AFTER reading the previous one.
    try {
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch {
      /* noop */
    }
  }, []);

  if (dismissedRecently || daysAway < 7) return null;

  // Tiered copy — calm, useful, never urgent.
  let title: string;
  let subtitle: string;
  if (daysAway >= 30) {
    title = 'PetSwap has grown in your area';
    subtitle = `${Math.max(trustedNearbyCount, 1)} trusted helpers near you · come say hi`;
  } else if (daysAway >= 14) {
    title = 'Your credits are waiting';
    subtitle =
      creditsBalance > 0
        ? `${creditsBalance} credit${creditsBalance === 1 ? '' : 's'} ready to book trusted help`
        : 'Earn credits helping a neighbour this week';
  } else {
    title = 'We found trusted helpers near you';
    subtitle = `${Math.max(trustedNearbyCount, 1)} new option${trustedNearbyCount === 1 ? '' : 's'} since you last visited`;
  }

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setDismissedRecently(true);
  };

  return (
    <button
      onClick={onCta}
      className={cn(
        'w-full p-4 rounded-lg text-left relative overflow-hidden transition-all duration-fast active:scale-[0.99]',
        'bg-gradient-to-br from-accent/40 via-background to-background border border-border-light',
        className,
      )}
    >
      <div className="flex items-center gap-3 pr-6">
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
            Welcome back
          </p>
          <p className="font-semibold text-[14px] leading-tight">{title}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1">
            {subtitle} <ArrowRight size={11} />
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      >
        <X size={13} />
      </button>
    </button>
  );
};

export default DormantWinbackBanner;
