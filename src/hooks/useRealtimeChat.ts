import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime chat hook for a 1:1 conversation.
 *
 * Surfaces:
 *  - messages (text / image / booking / system) with optimistic sends
 *  - typing indicator from the other participant
 *  - read receipts (auto-marks incoming as read while the chat is open)
 *  - chat-anchored bookings list (live)
 *
 * Designed to fail silently for unauthenticated sessions or non-UUID
 * mock IDs — callers can still render mock content above this layer.
 */

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kind: 'text' | 'image' | 'booking' | 'system';
  image_url: string | null;
  booking_id: string | null;
  /** Client-only: 'sending' | 'failed' for optimistic rows still in-flight. */
  _localStatus?: 'sending' | 'failed';
}

export interface ChatBooking {
  id: string;
  conversation_id: string;
  owner_id: string;
  helper_id: string;
  pet_id: string | null;
  care_request_id: string | null;
  swap_id: string | null;
  start_at: string;
  end_at: string;
  credits_amount: number;
  pickup_notes: string | null;
  status: 'proposed' | 'confirmed' | 'completed' | 'cancelled';
  proposed_by: string;
  confirmed_by_owner_at: string | null;
  confirmed_by_helper_at: string | null;
  completed_by_owner_at: string | null;
  completed_by_helper_at: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined): v is string => !!v && UUID_RE.test(v);

interface UseRealtimeChatResult {
  ready: boolean;
  conversationId: string | null;
  /** Conversation status — 'pending' = needs recipient acceptance, 'accepted' = open, 'declined' = blocked. */
  conversationStatus: 'pending' | 'accepted' | 'declined' | null;
  /** UID of the user who first opened the conversation (sent the first message). */
  initiatorId: string | null;
  /** Reload conversation row (e.g. after accept/decline). */
  refreshConversation: () => Promise<void>;
  messages: RealtimeMessage[];
  bookings: ChatBooking[];
  otherTyping: boolean;
  myUserId: string | null;
  send: (body: string) => Promise<void>;
  sendImage: (imageUrl: string) => Promise<void>;
  /** Insert a local-only optimistic image bubble (returns its tmp id). */
  beginLocalImage: (previewUrl: string) => string;
  /** Promote a local image bubble to a real message after upload. */
  completeLocalImage: (tmpId: string, signedUrl: string) => Promise<void>;
  /** Mark a local image bubble as failed (kept in list so user can dismiss). */
  failLocalImage: (tmpId: string) => void;
  /** Re-send a previously failed text message. */
  retry: (tmpId: string) => Promise<void>;
  notifyTyping: () => void;
  refreshBookings: () => Promise<void>;
  error: string | null;
}

const MESSAGE_COLS = 'id, conversation_id, sender_id, body, created_at, read_at, kind, image_url, booking_id';

export const useRealtimeChat = (otherUserId: string | null): UseRealtimeChatResult => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'pending' | 'accepted' | 'declined' | null>(null);
  const [initiatorId, setInitiatorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [bookings, setBookings] = useState<ChatBooking[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const typingTimerRef = useRef<number | null>(null);
  const otherTypingTimerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Resolve current user
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setMyUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setMyUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadBookings = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from('chat_bookings')
      .select('*')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true });
    setBookings((data as ChatBooking[]) ?? []);
  }, []);

  // Resolve conversation + initial messages + bookings
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setConversationId(null);
    setMessages([]);
    setBookings([]);
    setError(null);

    if (!myUserId || !isUuid(otherUserId)) {
      setReady(true);
      return;
    }

    (async () => {
      const { data: conv, error: convErr } = await supabase.rpc('get_or_create_conversation', {
        _other_user_id: otherUserId,
      });
      if (cancelled) return;
      if (convErr || !conv) {
        setError(convErr?.message ?? 'Could not open conversation');
        setReady(true);
        return;
      }
      const cRow = conv as { id: string; status?: 'pending' | 'accepted' | 'declined'; initiator_id?: string | null };
      const cid = cRow.id;
      setConversationId(cid);
      setConversationStatus(cRow.status ?? 'accepted');
      setInitiatorId(cRow.initiator_id ?? null);

      const [{ data: rows }, _] = await Promise.all([
        supabase
          .from('messages')
          .select(MESSAGE_COLS)
          .eq('conversation_id', cid)
          .order('created_at', { ascending: true })
          .limit(200),
        loadBookings(cid),
      ]);
      if (cancelled) return;
      setMessages((rows as RealtimeMessage[]) ?? []);
      setReady(true);

      await supabase.rpc('mark_conversation_read', { _conversation_id: cid });
      window.dispatchEvent(new CustomEvent('petswap:unread-changed'));
    })();

    return () => {
      cancelled = true;
    };
  }, [myUserId, otherUserId, loadBookings]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId || !myUserId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as RealtimeMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (msg.booking_id) loadBookings(conversationId);
          if (msg.sender_id !== myUserId) {
            supabase
              .rpc('mark_conversation_read', { _conversation_id: conversationId })
              .then(() => window.dispatchEvent(new CustomEvent('petswap:unread-changed')));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as RealtimeMessage;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_bookings', filter: `conversation_id=eq.${conversationId}` },
        () => loadBookings(conversationId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_id: string } | null;
          if (!row || row.user_id === myUserId) return;
          if (payload.eventType === 'DELETE') {
            setOtherTyping(false);
            return;
          }
          setOtherTyping(true);
          if (otherTypingTimerRef.current) window.clearTimeout(otherTypingTimerRef.current);
          otherTypingTimerRef.current = window.setTimeout(() => setOtherTyping(false), 4000);
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (otherTypingTimerRef.current) window.clearTimeout(otherTypingTimerRef.current);
    };
  }, [conversationId, myUserId, loadBookings]);

  const insertMessage = useCallback(
    async (payload: { body: string; kind: RealtimeMessage['kind']; image_url?: string | null }) => {
      if (!conversationId || !myUserId) {
        throw new Error('Missing conversation or user');
      }
      const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimistic: RealtimeMessage = {
        id: tmpId,
        conversation_id: conversationId,
        sender_id: myUserId,
        body: payload.body,
        created_at: new Date().toISOString(),
        read_at: null,
        kind: payload.kind,
        image_url: payload.image_url ?? null,
        booking_id: null,
        _localStatus: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error: insErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: myUserId,
          body: payload.body,
          kind: payload.kind,
          image_url: payload.image_url ?? null,
        })
        .select(MESSAGE_COLS)
        .single();

      if (insErr || !data) {
        console.error('Supabase message insert failed:', insErr);
        setMessages((prev) =>
          prev.map((m) => (m.id === tmpId ? { ...m, _localStatus: 'failed' } : m)),
        );
        const message = insErr?.message ?? 'Failed to send';
        setError(message);
        throw new Error(message);
      }
      setMessages((prev) =>
        prev.some((m) => m.id === (data as RealtimeMessage).id)
          ? prev.filter((m) => m.id !== tmpId)
          : prev.map((m) => (m.id === tmpId ? (data as RealtimeMessage) : m)),
      );
      // Value-moment prompt: after first message of session, ask for push.
      void import('@/lib/pushClient').then(({ maybePromptForPush }) =>
        maybePromptForPush('first_message'),
      );

      // CONVERSION TRACKING — flip the most recent 'match' push for this user
      // to converted=true, so we can compute push → chat conversion %.
      void supabase.rpc('mark_push_converted', {
        _user_id: myUserId, _type: 'match', _conversion: 'message_sent',
      });
      // Cross-channel orchestration: mark match_created event as converted so
      // the email-fallback worker won't fire a "you have a new match" email.
      void import('@/lib/orchestrate').then(({ markCommConverted }) =>
        markCommConverted(myUserId, 'match_created', conversationId, 'message_sent'),
      );

      // FUNNEL: chat_started (deduped per conversation per user)
      void import('@/lib/conversionEvents').then(({ recordConversionEvent }) =>
        recordConversionEvent({
          userId: myUserId,
          eventType: 'chat_started',
          sourceEventId: conversationId,
          conversationId,
        }),
      );

      // STREAK — record one engaged action per UTC day.
      void import('@/lib/streaks').then(({ recordStreakActivity }) =>
        recordStreakActivity('message_sent').then(() =>
          window.dispatchEvent(new CustomEvent('petswap:streak-changed')),
        ),
      );

      // SPEED-TO-ACTION: schedule a "3 messages, no booking" nudge once the
      // sender hits ≥3 outgoing messages in this conversation. Drainer cancels
      // the push at send-time if a chat_booking exists by then.
      void (async () => {
        try {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('sender_id', myUserId);
          if ((count ?? 0) === 3 && otherUserId) {
            const at2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            await supabase.from('pending_push_jobs').upsert([{
              user_id: myUserId,
              notification_type: 'message',
              title: "You're close — confirm your PetSwap",
              body: 'Lock in the dates now to keep momentum.',
              deep_link: `/messages?user=${otherUserId}`,
              idempotency_key: `chat_3msg_nudge:${conversationId}:${myUserId}`,
              scheduled_for: at2h,
              status: 'queued',
              source_event_id: conversationId,
              metadata: {
                type: 'chat_3msg_nudge',
                conversation_id: conversationId,
                other_user_id: otherUserId,
              },
            }], { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
          }
        } catch (e) {
          console.warn('[chat_3msg_nudge] schedule failed', e);
        }
      })();


      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', myUserId);

      // NEW MESSAGE PUSH
      // - Only the recipient gets it (sender_id !== receiver).
      // - Only when conversation is accepted (no pushes for pending requests).
      // - Server-side enforces: message-pref opt-in, quiet hours, dedupe via idempotency_key.
      if (
        conversationStatus === 'accepted' &&
        otherUserId &&
        otherUserId !== myUserId &&
        payload.kind !== 'system'
      ) {
        void (async () => {
          try {
            const inserted = data as RealtimeMessage;
            const { sendPush } = await import('@/lib/sendPush');
            const { data: meRow } = await supabase
              .from('profiles').select('first_name').eq('id', myUserId).maybeSingle();
            const senderName = meRow?.first_name?.trim() || 'Someone';
            const preview =
              payload.kind === 'image' ? '📷 Photo'
              : payload.kind === 'booking' ? '📅 Proposed a booking'
              : (payload.body || '').replace(/\s+/g, ' ').trim().slice(0, 80);
            void sendPush({
              userId: otherUserId,
              type: 'message',
              title: `New message from ${senderName}`,
              body: preview ? `${senderName}: ${preview}` : `${senderName} replied on PetSwap.`,
              deepLink: `/messages?user=${myUserId}`,
              idempotencyKey: `new_message:${inserted.id}:${otherUserId}`,
              sourceEventId: inserted.id,
              metadata: {
                type: 'new_message',
                conversation_id: conversationId,
                sender_id: myUserId,
                message_id: inserted.id,
              },
            });
          } catch (e) {
            // FAIL SAFETY — never crash the send flow.
            console.warn('[useRealtimeChat] message push failed', e);
          }
        })();
      }
    },
    [conversationId, conversationStatus, myUserId, otherUserId],
  );


  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      await insertMessage({ body: trimmed, kind: 'text' });
    },
    [insertMessage],
  );

  const sendImage = useCallback(
    async (imageUrl: string) => {
      await insertMessage({ body: '', kind: 'image', image_url: imageUrl });
    },
    [insertMessage],
  );

  // Local-only optimistic image bubble (used while uploading to storage).
  const beginLocalImage = useCallback(
    (previewUrl: string): string => {
      const tmpId = `tmp-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimistic: RealtimeMessage = {
        id: tmpId,
        conversation_id: conversationId ?? '',
        sender_id: myUserId ?? '',
        body: '',
        created_at: new Date().toISOString(),
        read_at: null,
        kind: 'image',
        image_url: previewUrl,
        booking_id: null,
        _localStatus: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);
      return tmpId;
    },
    [conversationId, myUserId],
  );

  const completeLocalImage = useCallback(
    async (tmpId: string, signedUrl: string) => {
      // Drop the local placeholder, then send the real one — DB row will arrive
      // optimistically inside insertMessage and via realtime on other clients.
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      await insertMessage({ body: '', kind: 'image', image_url: signedUrl });
    },
    [insertMessage],
  );

  const failLocalImage = useCallback((tmpId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tmpId ? { ...m, _localStatus: 'failed' } : m)),
    );
  }, []);

  const retry = useCallback(
    async (tmpId: string) => {
      const target = messages.find((m) => m.id === tmpId);
      if (!target || target._localStatus !== 'failed') return;
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      await insertMessage({
        body: target.body,
        kind: target.kind,
        image_url: target.image_url,
      });
    },
    [messages, insertMessage],
  );

  const notifyTyping = useCallback(() => {
    if (!conversationId || !myUserId) return;
    if (typingTimerRef.current) return; // throttle to once every 1.5s
    typingTimerRef.current = window.setTimeout(() => {
      typingTimerRef.current = null;
    }, 1500);
    supabase
      .from('typing_indicators')
      .upsert({ conversation_id: conversationId, user_id: myUserId, updated_at: new Date().toISOString() })
      .then(() => {
        window.setTimeout(() => {
          supabase
            .from('typing_indicators')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', myUserId);
        }, 5000);
      });
  }, [conversationId, myUserId]);

  const refreshBookings = useCallback(async () => {
    if (conversationId) await loadBookings(conversationId);
  }, [conversationId, loadBookings]);

  const refreshConversation = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from('conversations')
      .select('status, initiator_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (data) {
      const r = data as { status?: 'pending' | 'accepted' | 'declined'; initiator_id?: string | null };
      setConversationStatus(r.status ?? 'accepted');
      setInitiatorId(r.initiator_id ?? null);
    }
  }, [conversationId]);

  return {
    ready,
    conversationId,
    conversationStatus,
    initiatorId,
    refreshConversation,
    messages,
    bookings,
    otherTyping,
    myUserId,
    send,
    sendImage,
    beginLocalImage,
    completeLocalImage,
    failLocalImage,
    retry,
    notifyTyping,
    refreshBookings,
    error,
  };
};

