import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FIRST_SWAP_FLAGS } from '@/hooks/useFirstSwapState';
import { trackEvent } from '@/lib/analyticsStore';

/**
 * Fires a one-time celebration the first time the user receives a chat
 * message from someone else — reinforces the "you're officially active"
 * moment in the first-swap activation loop.
 *
 * Independent from useNewMessageToasts (which surfaces every inbound
 * message); this only runs once, and only on the very first reply.
 */
const FirstReplyListener = () => {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) userIdRef.current = data.user?.id ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userIdRef.current = session?.user?.id ?? null;
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('first-reply-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const me = userIdRef.current;
          if (!me) return;
          const msg = payload.new as { sender_id: string };
          if (msg.sender_id === me) return;
          let already = false;
          try { already = localStorage.getItem(FIRST_SWAP_FLAGS.firstReplyShown) === '1'; } catch { /* ignore */ }
          if (already) return;
          try { localStorage.setItem(FIRST_SWAP_FLAGS.firstReplyShown, '1'); } catch { /* ignore */ }
          trackEvent('first_swap_first_reply');
          try {
            window.dispatchEvent(new CustomEvent('petswap:celebrate'));
          } catch { /* ignore */ }
          toast.success("You're officially active on PetSwap 🎉", {
            description: 'Someone replied — keep the conversation going.',
            duration: 5000,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

export default FirstReplyListener;
