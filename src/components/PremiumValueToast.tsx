import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface Props {
  /** Show only when the user is a premium subscriber. */
  isPremium: boolean;
}

const COUNT_KEY = 'petswap.sessionCount';
const SHOWN_KEY = 'petswap.premiumValueToast.shownAt';
const SHOW_EVERY = 5;

/**
 * Quiet, dismissible toast that surfaces every 5th session for premium users.
 * Reinforces value without nagging.
 */
const PremiumValueToast = ({ isPremium }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    try {
      const count = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
      localStorage.setItem(COUNT_KEY, String(count));
      const lastShown = Number(localStorage.getItem(SHOWN_KEY) || 0);
      const cooled = Date.now() - lastShown > 24 * 60 * 60_000;
      if (count > 0 && count % SHOW_EVERY === 0 && cooled) {
        setVisible(true);
        localStorage.setItem(SHOWN_KEY, String(Date.now()));
      }
    } catch { /* noop */ }
  }, [isPremium]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-30 mx-auto max-w-sm animate-fade-in">
      <div className="card-elevated bg-card border border-primary/15 p-3.5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[13px] leading-tight">You're saving on every swap</p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
            Premium members typically save £££ vs traditional pet sitters.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="p-1 rounded-full text-muted-foreground hover:bg-muted"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default PremiumValueToast;
