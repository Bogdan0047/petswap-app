import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to messages for the current user and exposes a live unread count.
 * Falls back to 0 when unauthenticated.
 */
export const useUnreadCount = (): number => {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      const { data, error } = await supabase.rpc('unread_message_count');
      if (!cancelled && !error) setCount((data as number) ?? 0);
    };
    refresh();

    const onLocal = () => refresh();
    window.addEventListener('petswap:unread-changed', onLocal);

    const channel = supabase
      .channel(`unread:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as { sender_id: string };
          if (m.sender_id !== userId) refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('petswap:unread-changed', onLocal);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
};
