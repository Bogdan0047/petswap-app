import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface Props {
  newMatchesCount: number;
  onCta: () => void;
}

const LAST_VISIT_KEY = 'petswap.lastVisit';
const DISMISS_KEY = 'petswap.reengagementBanner.dismissedAt';
const TWO_DAYS = 2 * 24 * 60 * 60_000;

/**
 * Shows when the user hasn't opened the app for >2 days AND there are new
 * nearby matches. Dismisses for 24h. Updates the last-visit stamp on mount.
 */
const ReengagementBanner = ({ newMatchesCount, onCta }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      const now = Date.now();
      const wasGone = last > 0 && now - last > TWO_DAYS;
      const dismissedRecently = dismissedAt > 0 && now - dismissedAt < 24 * 60 * 60_000;
      if (wasGone && !dismissedRecently && newMatchesCount > 0) setShow(true);
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    } catch { /* noop */ }
  }, [newMatchesCount]);

  if (!show) return null;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setShow(false);
  };

  return (
    <button
      onClick={onCta}
      className="w-full p-4 rounded-2xl text-left relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/15 tap-feedback"
    >
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[14px] leading-tight">Welcome back</p>
          <p className="text-[12.5px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
            {newMatchesCount} new {newMatchesCount === 1 ? 'match' : 'matches'} found near you
            <ArrowRight size={12} />
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:bg-muted"
      >
        <X size={13} />
      </button>
    </button>
  );
};

export default ReengagementBanner;
