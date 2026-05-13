import { Lock, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsStore';
import { haptic } from '@/lib/haptic';

interface Props {
  onCta: () => void;
}

/**
 * Profile nudge for users with zero completed swaps. Frames the first
 * swap as the gateway to "full trust" — high-impact, low-friction.
 */
const FirstSwapNudge = ({ onCta }: Props) => {
  return (
    <button
      type="button"
      onClick={() => {
        haptic('light');
        trackEvent('first_swap_profile_nudge_tap');
        onCta();
      }}
      className="w-full text-left card-elevated p-4 flex items-center gap-3 active:scale-[0.99] transition ring-1 ring-primary/15"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, hsl(var(--background)) 80%)',
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Lock size={17} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[14px] leading-tight">
          Complete your first swap to unlock full trust
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          One swap unlocks your trusted-member badge.
        </p>
      </div>
      <ArrowRight size={16} className="text-primary flex-shrink-0" />
    </button>
  );
};

export default FirstSwapNudge;
