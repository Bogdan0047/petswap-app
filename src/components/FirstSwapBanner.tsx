import { Sparkles, ArrowRight, X } from 'lucide-react';
import { haptic } from '@/lib/haptic';
import { trackEvent } from '@/lib/analyticsStore';

interface Props {
  onCta: () => void;
  onDismiss: () => void;
}

/**
 * First-Swap activation banner — shown to new users on Home until they
 * either send their first request or explicitly dismiss it.
 */
const FirstSwapBanner = ({ onCta, onDismiss }: Props) => {
  return (
    <div
      role="region"
      aria-label="Get your first swap"
      className="relative overflow-hidden rounded-2xl p-5 ring-1 ring-primary/20 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.35)]"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary)/0.10) 0%, hsl(var(--primary)/0.04) 60%, hsl(var(--background)) 100%)',
      }}
    >
      <button
        type="button"
        onClick={() => {
          haptic('light');
          trackEvent('first_swap_banner_dismiss');
          onDismiss();
        }}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:scale-95 transition"
      >
        <X size={15} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-bold leading-tight">Get your first swap today 🐾</p>
          <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
            People nearby are ready to help — most replies arrive within a day.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          haptic('medium');
          trackEvent('first_swap_banner_cta');
          onCta();
        }}
        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold text-[13.5px] py-3 rounded-xl active:scale-[0.98] transition shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]"
      >
        Find someone now
        <ArrowRight size={15} />
      </button>
    </div>
  );
};

export default FirstSwapBanner;
