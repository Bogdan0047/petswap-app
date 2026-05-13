import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * App-wide listener that surfaces a small toast when a new chat message
 * arrives for the current user, except when they are already viewing the
 * Messages tab. Tapping the toast deep-links into Messages.
 */
export const useNewMessageToasts = () => {
  const navigate = useNavigate();
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
      .channel('new-message-toasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const me = userIdRef.current;
          if (!me) return;
          const msg = payload.new as {
            sender_id: string;
            body: string;
            kind: string;
            conversation_id: string;
          };
          if (msg.sender_id === me) return;
          // RLS guarantees we only get conversations we participate in.
          if (window.location.pathname.startsWith('/messages') || window.location.pathname.startsWith('/chat')) {
            return;
          }
          const preview =
            msg.kind === 'image'
              ? '📷 Sent a photo'
              : msg.kind === 'booking'
                ? '📅 Proposed a booking'
                : msg.body.slice(0, 80);
          toast('New message', {
            description: preview,
            action: {
              label: 'Open',
              onClick: () => navigate(`/messages?user=${msg.sender_id}`),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);
};
