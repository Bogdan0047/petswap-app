import { useEffect, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

interface StickyHelpCtaProps {
  onTap: () => void;
  /** Show after this fraction (0–1) of the document is scrolled. Default 0.35. */
  showAfterRatio?: number;
  /** Hide when within this many pixels of page bottom. Default 220. */
  hideNearFooter?: number;
}

/**
 * Slim sticky bottom “Need help now?” pill.
 * - Appears after 35% scroll, hides near the page footer to avoid overlap.
 * - Sits above the bottom nav and respects iOS safe-area.
 * - Compositor-only animations → 60fps with no scroll cost.
 */
const StickyHelpCta = ({
  onTap,
  showAfterRatio = 0.35,
  hideNearFooter = 220,
}: StickyHelpCtaProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const y = window.scrollY;
        const ratio = total > 0 ? y / total : 0;
        const distanceFromBottom = total - y;
        const shouldShow = ratio >= showAfterRatio && distanceFromBottom > hideNearFooter;
        setVisible(shouldShow);
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [showAfterRatio, hideNearFooter]);

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 px-4 transition-all duration-300 ease-out',
        // BottomNav ≈ 68px + safe area; lift this above with comfortable spacing.
        'bottom-[84px] safe-bottom',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none',
      )}
      aria-hidden={!visible}
    >
      <button
        onClick={() => {
          haptic('medium');
          onTap();
        }}
        className="mx-auto max-w-md w-full inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-elevated tap-feedback"
        style={{ background: 'var(--gradient-primary, hsl(var(--primary)))' }}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Plus size={14} strokeWidth={2.6} />
          </span>
          <span className="font-semibold text-[13.5px] truncate">Need help now? Post request</span>
        </span>
        <ArrowRight size={15} className="flex-shrink-0" />
      </button>
    </div>
  );
};

export default StickyHelpCta;
