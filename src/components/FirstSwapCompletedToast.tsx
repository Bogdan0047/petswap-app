import { useEffect } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analyticsStore';

/**
 * Listens for the one-shot `petswap:first-swap-completed` event (dispatched
 * from useFirstSwapState when completed_swaps flips 0 → 1) and surfaces a
 * social-proof toast that frames the user as a trusted member.
 */
const FirstSwapCompletedToast = () => {
  useEffect(() => {
    const onDone = () => {
      trackEvent('first_swap_completed_celebrate');
      toast.success("You're now a trusted member 🔒", {
        description: "People trust you — you'll get more requests now.",
        duration: 6000,
      });
    };
    window.addEventListener('petswap:first-swap-completed', onDone as EventListener);
    return () => window.removeEventListener('petswap:first-swap-completed', onDone as EventListener);
  }, []);
  return null;
};

export default FirstSwapCompletedToast;
