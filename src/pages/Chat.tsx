import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, Star, CalendarPlus, ChevronDown, WifiOff, Search } from 'lucide-react';
import { useSearchParams, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/friendlyError';
import { mockUsers, mockMessages, chatQuickPrompts, type Message } from '@/data/mockData';
import { getUserAvatar } from '@/assets/images';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import ChatBubble from '@/components/ChatBubble';
import MessagePreviewCard from '@/components/MessagePreviewCard';
import FilterChip from '@/components/FilterChip';
import TrustScore from '@/components/TrustScore';
import TrustBadge from '@/components/TrustBadge';
import TrustHeroPill from '@/components/TrustHeroPill';
import UserActionsMenu from '@/components/UserActionsMenu';
import ChatBookingCard from '@/components/ChatBookingCard';
import ChatBookingProposeSheet from '@/components/ChatBookingProposeSheet';
import ChatImageUploadButton from '@/components/ChatImageUploadButton';
import ChatReviewSheet from '@/components/ChatReviewSheet';
import ImageLightbox from '@/components/ImageLightbox';
import ChatComposer, { type ChatComposerHandle } from '@/components/ChatComposer';
import SafetyBanner from '@/components/SafetyBanner';
import ChatTrustWarning from '@/components/ChatTrustWarning';
import MessageRequestGate from '@/components/MessageRequestGate';
import { computeTrust } from '@/lib/trust';
import { useBlockedIds } from '@/lib/blockStore';
import { useRealtimeChat, type ChatBooking, type RealtimeMessage } from '@/hooks/useRealtimeChat';
import { isOnline, presenceLabel } from '@/hooks/usePresence';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { haptic } from '@/lib/haptic';
import { supabase } from '@/integrations/supabase/client';
import { resolveRealUserId } from '@/lib/userIdMap';
import { cn } from '@/lib/utils';
import { openPaywall, shouldShowPaywall } from '@/lib/paywallStore';
import { useSubscription } from '@/hooks/useSubscription';

const SMART_REPLIES = [
  "Yes, I'm available 👍",
  "Sorry, I'm unavailable",
  'Can we discuss times?',
  'Sounds good!',
];

type InboxFilter = 'all' | 'unread' | 'bookings' | 'archived';

const inboxFilters: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'archived', label: 'Archived' },
];

const ChatList = ({ onSelect }: { onSelect: (id: string) => void }) => {
  const blockedIds = useBlockedIds();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  const conversations = [
    { user: mockUsers[0], lastMsg: mockMessages[2].body, unread: 1, time: '10:38 AM', isBooking: true, online: true },
    { user: mockUsers[2], lastMsg: mockMessages[4].body, unread: 0, time: 'Yesterday', isBooking: false, online: false },
  ].filter((c) => !blockedIds.includes(c.user.id));

  const q = query.trim().toLowerCase();
  const matchesQuery = (c: typeof conversations[number]) =>
    !q ||
    c.user.firstName.toLowerCase().includes(q) ||
    c.lastMsg.toLowerCase().includes(q);

  const matchesFilter = (c: typeof conversations[number]) => {
    if (filter === 'unread') return c.unread > 0;
    if (filter === 'bookings') return c.isBooking;
    if (filter === 'archived') return false;
    return true;
  };

  const filtered = conversations.filter((c) => matchesQuery(c) && matchesFilter(c));
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0);

  return (
    <div className="px-5">
      {conversations.length > 0 && (
        <>
          {/* Premium glass search */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages"
              className="w-full pl-11 pr-4 h-11 rounded-2xl bg-surface-muted/80 backdrop-blur-md ring-1 ring-border/60 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              style={{ fontSize: '16px' }}
              aria-label="Search messages"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {inboxFilters.map((f) => {
              const active = filter === f.id;
              const showBadge = f.id === 'unread' && unreadCount > 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 active:scale-[0.96]',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-surface-muted text-foreground/75 hover:bg-muted',
                  )}
                >
                  {f.label}
                  {showBadge && (
                    <span
                      className={cn(
                        'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                        active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="space-y-2.5 stagger">
        {filtered.length > 0 ? (
          filtered.map(({ user, lastMsg, unread, time, online }) => (
            <MessagePreviewCard
              key={user.id}
              name={user.firstName}
              avatarUrl={getUserAvatar(user.id)}
              avatarEmoji={user.avatarEmoji}
              lastMessage={lastMsg}
              time={time}
              unread={unread}
              verified={user.isEmailVerified && user.isPhoneVerified}
              online={online}
              rating={user.averageRating}
              onPress={() => onSelect(user.id)}
            />
          ))
        ) : q ? (
          <EmptyState
            emoji="🔍"
            title="No matches"
            description={`Nothing for "${query}". Try another name or keyword.`}
          />
        ) : filter !== 'all' ? (
          <EmptyState
            emoji="✨"
            title="All caught up"
            description={
              filter === 'unread'
                ? 'No unread messages right now. Beautifully quiet.'
                : filter === 'bookings'
                ? 'No active booking chats yet.'
                : 'Nothing archived. Old chats you tuck away will live here.'
            }
          />
        ) : (
          <EmptyState
            emoji="💬"
            title="No chats yet"
            description="Connect with trusted neighbours nearby to start your first conversation."
            actionLabel="Find helpers"
            onAction={() => {}}
          />
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Time / day helpers
// ────────────────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const dayKey = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso;
  }
};

const dayLabel = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (isSameDay) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    const diff = (now.getTime() - d.getTime()) / 86_400_000;
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

const TypingDots = () => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-[18px] rounded-bl-[6px] px-3.5 py-2.5 inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

const MessageSkeleton = () => (
  <div className="space-y-3 px-1 animate-fade-in">
    {[60, 40, 70, 35].map((w, i) => (
      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
        <div
          className="h-9 rounded-[18px] bg-muted/70 animate-pulse"
          style={{ width: `${w}%` }}
        />
      </div>
    ))}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Chat view
// ────────────────────────────────────────────────────────────────────────────
const NEAR_BOTTOM_PX = 120;
const mockConversationForUser = (id: string) => (id === '3' ? 'c2' : 'c1');
type LocalMessage = Message & { _localStatus?: 'sending' | 'failed' | 'sent' };

interface DebugState {
  sendClicked: boolean;
  messageLength: number;
  localAppend: 'idle' | 'success' | 'fail';
  backendInsert: 'idle' | 'pending' | 'success' | 'fail';
  supabaseError: string | null;
  rlsResult: string;
}

const ChatDebugPanel = ({
  conversationId,
  currentUserId,
  receiverId,
  state,
}: {
  conversationId: string | null;
  currentUserId: string | null;
  receiverId: string;
  state: DebugState;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  if (!import.meta.env.DEV) return null;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-2 leading-tight">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-mono truncate max-w-[180px] text-right">{value}</span>
    </div>
  );
  return (
    <div className="fixed top-2 right-2 z-[9999] text-[10px] bg-black/85 text-white rounded-lg shadow-2xl backdrop-blur-md ring-1 ring-white/10 max-w-[260px]">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between font-bold uppercase tracking-wider"
      >
        <span>🐛 Chat Debug</span>
        <span className="text-white/50">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="px-2.5 pb-2 space-y-0.5">
          {row('conversationId', conversationId ? conversationId.slice(0, 8) + '…' : '∅')}
          {row('currentUserId', currentUserId ? currentUserId.slice(0, 8) + '…' : '∅')}
          {row('receiverId', receiverId.slice(0, 8) + (receiverId.length > 8 ? '…' : ''))}
          {row('messageText.len', state.messageLength)}
          {row('sendClicked', String(state.sendClicked))}
          {row(
            'localAppend',
            <span className={state.localAppend === 'fail' ? 'text-red-400' : state.localAppend === 'success' ? 'text-green-400' : ''}>
              {state.localAppend}
            </span>,
          )}
          {row(
            'backendInsert',
            <span className={state.backendInsert === 'fail' ? 'text-red-400' : state.backendInsert === 'success' ? 'text-green-400' : ''}>
              {state.backendInsert}
            </span>,
          )}
          {row('supabaseError', state.supabaseError ?? '—')}
          {row('rlsResult', state.rlsResult)}
        </div>
      )}
    </div>
  );
};

const ChatView = ({ userId, onBack }: { userId: string; onBack: () => void }) => {
  const [proposeOpen, setProposeOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<ChatBooking | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pasteUploading, setPasteUploading] = useState(false);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const firstUnreadIdRef = useRef<string | null>(null);
  const dividerScrolledRef = useRef(false);
  const composerRef = useRef<ChatComposerHandle>(null);
  const isOnlineNet = useOnlineStatus();

  const [debugState, setDebugState] = useState<DebugState>({
    sendClicked: false,
    messageLength: 0,
    localAppend: 'idle',
    backendInsert: 'idle',
    supabaseError: null,
    rlsResult: 'unknown',
  });

  // Translate UI mock id ("1") → real seeded Supabase user UUID.
  const realOtherUserId = useMemo(() => resolveRealUserId(userId), [userId]);
  const user = mockUsers.find((u) => u.id === userId);
  const avatar = user ? getUserAvatar(user.id) : undefined;
  const trust = user ? computeTrust(user) : null;

  const {
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
    notifyTyping,
    beginLocalImage,
    completeLocalImage,
    failLocalImage,
    retry,
  } = useRealtimeChat(realOtherUserId);

  // Record a profile-view when the user opens a real chat with someone.
  // Dedupes per browser session inside recordProfileView.
  useEffect(() => {
    if (realOtherUserId) {
      void import('@/lib/profileViews').then(({ recordProfileView }) =>
        recordProfileView(realOtherUserId),
      );
    }
  }, [realOtherUserId]);

  // Pending request state — derived from conversation row.
  const isPendingRequest = conversationStatus === 'pending';
  const iAmInitiator = !!myUserId && !!initiatorId && myUserId === initiatorId;
  const iAmRecipient = isPendingRequest && !iAmInitiator;
  const firstMessage = messages.find((m) => m.kind === 'text' || m.kind === 'image');

  const isRealtime = !!conversationId && !!myUserId;
  const { isTrustedPlus } = useSubscription();
  const receiverId = realOtherUserId ?? userId;
  const fallbackConversationId = mockConversationForUser(userId);

  useEffect(() => {
    if (isRealtime) setLocalMessages([]);
  }, [isRealtime]);

  const otherLastSeen = (user as { lastActive?: string } | undefined)?.lastActive ?? null;
  const online = isOnline(otherLastSeen);
  const presence = presenceLabel(otherLastSeen);

  const bookingsById = useMemo(() => {
    const map = new Map<string, ChatBooking>();
    bookings.forEach((b) => map.set(b.id, b));
    return map;
  }, [bookings]);

  // Open the review sheet when arriving via /reviews/:bookingId
  // (ReviewRedirect forwards to /messages?user=...#review-{bookingId}).
  useEffect(() => {
    const hash = window.location.hash;
    const m = hash.match(/^#review-([0-9a-f-]+)$/i);
    if (!m) return;
    const b = bookingsById.get(m[1]);
    if (b) {
      setReviewBooking(b);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [bookingsById]);

  // ── Keyboard handling (iOS Safari + Android) ────────────────────────────
  const keyboardInset = useKeyboardInset();

  // ── Scroll management ───────────────────────────────────────────────────
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const wasNearBottomRef = useRef(true);

  const isNearBottom = () => {
    const el = scrollerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowJumpToLatest(false);
    setUnseenCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    wasNearBottomRef.current = near;
    if (near) {
      setShowJumpToLatest(false);
      setUnseenCount(0);
    }
  }, []);

  // Capture the first unread incoming message id once, on initial load.
  useEffect(() => {
    if (!ready || firstUnreadIdRef.current) return;
    const firstUnread = messages.find(
      (m) => m.sender_id !== myUserId && !m.read_at && m.kind !== 'system',
    );
    if (firstUnread) firstUnreadIdRef.current = firstUnread.id;
  }, [ready, messages, myUserId]);

  // Keep pinned to bottom on initial load (or scroll to "New messages" divider).
  useLayoutEffect(() => {
    if (!ready) return;
    if (firstUnreadIdRef.current && !dividerScrolledRef.current) {
      dividerScrolledRef.current = true;
      requestAnimationFrame(() => {
        const el = document.getElementById(`unread-divider-${firstUnreadIdRef.current}`);
        if (el && scrollerRef.current) {
          const top = el.offsetTop - 60;
          scrollerRef.current.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
          return;
        }
        scrollToBottom('auto');
      });
    } else {
      scrollToBottom('auto');
    }
  }, [ready, scrollToBottom]);

  useLayoutEffect(() => {
    if (keyboardInset > 0 && wasNearBottomRef.current) scrollToBottom('auto');
  }, [keyboardInset, scrollToBottom]);

  // React to new messages: auto-follow if near bottom, else show jump pill.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if (lastMsgIdRef.current === last.id) return;
    const isNew = lastMsgIdRef.current !== null;
    lastMsgIdRef.current = last.id;

    if (!isNew) return;

    if (wasNearBottomRef.current || last.sender_id === myUserId) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } else {
      setShowJumpToLatest(true);
      if (last.sender_id !== myUserId) setUnseenCount((c) => c + 1);
    }
  }, [messages, myUserId, scrollToBottom]);

  // Typing indicator should also nudge scroll if we were following
  useEffect(() => {
    if (otherTyping && wasNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [otherTyping, scrollToBottom]);


  // ── Send handler — validates IDs, appends instantly, then persists ──────
  const handleComposerSend = useCallback(
    async (body: string) => {
      const message = body.trim();
      console.log('CHAT_SEND_CLICKED', { message, length: message.length });

      const activeConversationId = conversationId ?? fallbackConversationId;
      const currentUserId = myUserId ?? 'me';

      setDebugState((s) => ({
        ...s,
        sendClicked: true,
        messageLength: message.length,
        localAppend: 'idle',
        backendInsert: 'idle',
        supabaseError: null,
      }));

      const missing = [
        !activeConversationId && 'conversationId',
        !currentUserId && 'currentUserId',
        !receiverId && 'receiverId',
        !message && 'message body',
      ].filter(Boolean) as string[];

      if (missing.length > 0) {
        setDebugState((s) => ({ ...s, supabaseError: `Missing ${missing.join(', ')}`, rlsResult: 'skipped' }));
        toast.error("Your message didn't send. Please try again.");
        throw new Error(`Missing ${missing.join(', ')}`);
      }

      if (isRealtime) {
        setDebugState((s) => ({ ...s, backendInsert: 'pending', localAppend: 'success' }));
        try {
          await send(message);
          setDebugState((s) => ({ ...s, backendInsert: 'success', rlsResult: 'allow' }));
          requestAnimationFrame(() => scrollToBottom('smooth'));

          // Chat momentum paywall: after 3+ outgoing messages, nudge non-subscribers.
          try {
            const myOutgoing = messages.filter((m) => m.sender_id === myUserId).length + 1;
            if (myOutgoing >= 3 && !isTrustedPlus && shouldShowPaywall('chat_momentum')) {
              setTimeout(() => openPaywall({ trigger: 'chat_momentum' }), 600);
            }
          } catch { /* noop */ }

          return;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          const isRls = /row-level security|policy/i.test(msg);
          console.error('Supabase message insert failed:', error);
          setDebugState((s) => ({
            ...s,
            backendInsert: 'fail',
            supabaseError: msg,
            rlsResult: isRls ? 'deny (RLS)' : 'allow (other err)',
          }));
          toast.error(friendlyError(error, "message"), {
            description: 'Tap the failed bubble to retry.',
          });
          requestAnimationFrame(() => scrollToBottom('smooth'));
          throw error;
        }
      }

      // Mock-mode local append
      try {
        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const outgoing: LocalMessage = {
          id: localId,
          conversationId: activeConversationId,
          senderId: currentUserId,
          body: message,
          createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          read: false,
          _localStatus: 'sent',
        };
        setLocalMessages((prev) => [...prev, outgoing]);
        setDebugState((s) => ({ ...s, localAppend: 'success', backendInsert: 'success', rlsResult: 'mock' }));
        requestAnimationFrame(() => scrollToBottom('smooth'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setDebugState((s) => ({ ...s, localAppend: 'fail', supabaseError: msg }));
        toast.error(friendlyError(e, "message"));
        throw e;
      }
    },
    [conversationId, fallbackConversationId, isRealtime, myUserId, receiverId, scrollToBottom, send],
  );

  const handleTyping = useCallback(() => {
    if (isRealtime) notifyTyping();
  }, [isRealtime, notifyTyping]);


  // ── Image upload preview wiring ─────────────────────────────────────────
  const handleLocalPreview = (previewUrl: string) => beginLocalImage(previewUrl);
  const handleUploadDone = (signedUrl: string, token?: string) => {
    if (token) void completeLocalImage(token, signedUrl);
  };
  const handleUploadFail = (token?: string) => {
    if (token) failLocalImage(token);
  };

  // Paste an image straight into the composer → upload + send as photo.
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!isRealtime || !conversationId || !myUserId) return;
      const file = Array.from(e.clipboardData.files).find((f) =>
        f.type.startsWith('image/'),
      );
      if (!file) return;
      e.preventDefault();
      if (file.size > 5 * 1024 * 1024) {
        toast.error('That photo is too large. Please choose one under 5 MB.');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      const token = beginLocalImage(previewUrl);
      setPasteUploading(true);
      const ext = file.name.split('.').pop()?.toLowerCase().slice(0, 5) || 'png';
      const path = `${conversationId}/${myUserId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (upErr) {
        URL.revokeObjectURL(previewUrl);
        failLocalImage(token);
        setPasteUploading(false);
        toast.error(friendlyError(upErr, "upload"));
        return;
      }
      const { data: signed } = await supabase.storage
        .from('chat-images')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      URL.revokeObjectURL(previewUrl);
      setPasteUploading(false);
      if (signed?.signedUrl) {
        void completeLocalImage(token, signed.signedUrl);
        haptic('light');
      } else {
        failLocalImage(token);
      }
    },
    [isRealtime, conversationId, myUserId, beginLocalImage, completeLocalImage, failLocalImage],
  );

  const handleCopyToast = () => toast.success('Copied');

  // ── Render messages with grouping + day separators ──────────────────────
  const renderMessages = () => {
    if (!ready && isRealtime) return <MessageSkeleton />;
    if (!isRealtime) {
      return localMessages.map((msg) => (
        <ChatBubble
          key={msg.id}
          variant={msg.senderId === 'me' ? 'sent' : 'received'}
          body={msg.body}
          time={msg.createdAt}
          status={msg.senderId === 'me' ? msg._localStatus : undefined}
          onRetry={
            msg._localStatus === 'failed'
              ? () => composerRef.current?.setText(msg.body)
              : undefined
          }
        />
      ));
    }
    if (messages.length === 0) {
      return (
        <p className="text-center text-[13px] text-muted-foreground py-8">
          Say hello to {user?.firstName} 👋
        </p>
      );
    }

    const out: React.ReactNode[] = [];
    let prevDay = '';
    let prevSender = '';

    messages.forEach((msg, idx) => {
      const next = messages[idx + 1];
      const dKey = dayKey(msg.created_at);
      if (dKey !== prevDay) {
        out.push(
          <div key={`day-${dKey}-${msg.id}`} className="flex justify-center pt-2 pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full">
              {dayLabel(msg.created_at)}
            </span>
          </div>,
        );
        prevDay = dKey;
        prevSender = '';
      }

      // "New messages" divider — placed above the first unread incoming msg.
      if (firstUnreadIdRef.current === msg.id) {
        out.push(
          <div
            key={`unread-${msg.id}`}
            id={`unread-divider-${msg.id}`}
            className="flex items-center gap-2 my-3 animate-fade-in"
          >
            <span className="flex-1 h-px bg-primary/25" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary">
              New
            </span>
            <span className="flex-1 h-px bg-primary/25" />
          </div>,
        );
        prevSender = '';
      }

      if (msg.kind === 'booking' && msg.booking_id) {
        const b = bookingsById.get(msg.booking_id);
        if (b) {
          out.push(
            <ChatBookingCard
              key={msg.id}
              booking={b}
              myUserId={myUserId!}
              otherFirstName={user?.firstName ?? 'them'}
              onCompleted={(completed) => setReviewBooking(completed)}
            />,
          );
          prevSender = '';
          return;
        }
      }
      if (msg.kind === 'system') {
        out.push(
          <div key={msg.id} className="text-center py-1">
            <p className="text-[11.5px] text-muted-foreground inline-block px-3 py-1 rounded-full bg-muted">
              {msg.body}
            </p>
          </div>,
        );
        prevSender = '';
        return;
      }

      const sameSenderNext =
        next && next.sender_id === msg.sender_id && next.kind !== 'system' && next.kind !== 'booking';
      const showTail = !sameSenderNext;
      const status: 'sending' | 'failed' | 'read' | 'sent' | undefined =
        msg.sender_id !== myUserId
          ? undefined
          : msg._localStatus === 'sending'
            ? 'sending'
            : msg._localStatus === 'failed'
              ? 'failed'
              : msg.read_at
                ? 'read'
                : 'sent';

      out.push(
        <ChatBubble
          key={msg.id}
          variant={msg.sender_id === myUserId ? 'sent' : 'received'}
          body={msg.body}
          imageUrl={msg.kind === 'image' ? msg.image_url ?? undefined : undefined}
          // Only show time on the last bubble of a same-sender group → tighter spacing
          time={showTail ? formatTime(msg.created_at) : undefined}
          status={status}
          showTail={showTail}
          onRetry={msg._localStatus === 'failed' ? () => retry(msg.id) : undefined}
          onImageTap={(url) => setLightboxSrc(url)}
          onCopy={handleCopyToast}
          className={prevSender === msg.sender_id ? 'mt-0.5' : 'mt-2'}
        />,
      );
      prevSender = msg.sender_id;
    });

    return out;
  };

  

  return (
    <div
      className="flex flex-col bg-background fixed inset-0"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-3 safe-top border-b border-border bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 tap-feedback" aria-label="Back">
            <ArrowLeft size={24} />
          </button>
          <div className="relative w-10 h-10 rounded-full bg-accent overflow-hidden flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt={user?.firstName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">{user?.avatarEmoji}</div>
            )}
            {online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] truncate">{user?.firstName}</p>
            <p className="text-[11px] text-muted-foreground truncate min-h-[14px]">
              {otherTyping ? (
                <span className="text-primary font-medium">typing…</span>
              ) : online ? (
                <span className="text-success font-medium">Active now</span>
              ) : presence ? (
                presence
              ) : (
                <>
                  {user?.area} · {user?.distance}
                </>
              )}
            </p>
          </div>
          {isRealtime && (
            <button
              onClick={() => setProposeOpen(true)}
              className="p-2 rounded-md hover:bg-muted tap-feedback"
              aria-label="Propose a booking"
            >
              <CalendarPlus size={20} className="text-primary" />
            </button>
          )}
          {user && <UserActionsMenu userId={user.id} userName={user.firstName} onBlocked={onBack} />}
        </div>
        {trust && user && (
          <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-12">
            <TrustHeroPill score={trust.score} tier={trust.tier} size="sm" />
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold">
              <Star size={11} className="text-warning" fill="currentColor" /> {user.averageRating}
              <span className="text-muted-foreground font-normal ml-0.5">({user.totalReviews})</span>
            </span>
            <span className="text-[11px] text-muted-foreground">· {user.completedSwaps} swaps</span>
            {user.isIdVerified && <TrustBadge type="id_checked" />}
          </div>
        )}
      </div>

      {!isOnlineNet && (
        <div className="mx-5 mt-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 animate-fade-in">
          <WifiOff size={14} className="text-warning shrink-0" />
          <p className="text-[12px] font-medium text-foreground">
            You're offline. Messages will send when you reconnect.
          </p>
        </div>
      )}

      <SafetyBanner />
      {trust && user && (
        <ChatTrustWarning trustScore={trust.score} isIdVerified={user.isIdVerified} firstName={user.firstName} />
      )}

      {/* Recipient sees the request gate; sender sees a "waiting" hint */}
      {iAmRecipient && conversationId && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <MessageRequestGate
            conversationId={conversationId}
            initiatorUserId={initiatorId ?? undefined}
            initiatorName={user?.firstName ?? 'Someone'}
            firstMessagePreview={firstMessage?.body || (firstMessage?.kind === 'image' ? 'Sent a photo' : undefined)}
            onAccepted={() => void refreshConversation()}
            onDeclined={onBack}
          />
        </div>
      )}

      {/* Messages */}
      {!iAmRecipient && (
        <div className="flex-1 relative min-h-0">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-y-auto px-5 pt-2 pb-3"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
          >
            {renderMessages()}
            {otherTyping && <div className="mt-2">{<TypingDots />}</div>}
            <div className="h-1" aria-hidden />
          </div>

          {/* Jump-to-latest pill */}
          {showJumpToLatest && (
            <button
              onClick={() => scrollToBottom('smooth')}
              className="absolute left-1/2 -translate-x-1/2 bottom-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold shadow-lg animate-fade-in tap-feedback"
            >
              <ChevronDown size={14} />
              {unseenCount > 0 ? `${unseenCount} new message${unseenCount > 1 ? 's' : ''}` : 'Jump to latest'}
            </button>
          )}
        </div>
      )}

      {/* Sender waiting state */}
      {iAmInitiator && isPendingRequest && (
        <div className="px-5 py-3 mx-3 my-2 rounded-xl bg-muted/60 ring-1 ring-border text-center">
          <p className="text-[12.5px] text-muted-foreground">
            Waiting for <span className="font-semibold text-foreground">{user?.firstName}</span> to accept your request.
          </p>
        </div>
      )}

      {/* Sticky CTA: Propose PetSwap dates — accepted chat + no active booking */}
      {isRealtime && !isPendingRequest && !bookings.some((b) => b.status === 'proposed' || b.status === 'confirmed') && (
        <div className="px-4 pt-1 pb-2">
          <button
            onClick={() => {
              haptic('medium');
              setProposeOpen(true);
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-[14px] shadow-elevated tap-feedback"
          >
            <CalendarPlus size={16} />
            Propose PetSwap dates
          </button>
        </div>
      )}


      {!isPendingRequest && (
        <div className="px-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(isRealtime ? SMART_REPLIES : chatQuickPrompts.slice(0, 3)).map((p) => (
            <FilterChip
              key={p}
              label={p}
              onPress={() => {
                composerRef.current?.setText(p);
                haptic('light');
              }}
            />
          ))}
        </div>
      )}

      {/* Composer — gated when pending. Sender may send only if no message yet (the very first one). */}
      {!iAmRecipient && (
        <ChatComposer
          ref={composerRef}
          onSend={handleComposerSend}
          onTyping={handleTyping}
          onPaste={handlePaste}
          keyboardInset={keyboardInset}
          disabled={iAmInitiator && isPendingRequest && messages.some((m) => m.sender_id === myUserId)}
          placeholder={
            pasteUploading
              ? 'Uploading photo…'
              : iAmInitiator && isPendingRequest && messages.some((m) => m.sender_id === myUserId)
                ? 'Waiting for them to accept your request…'
                : 'Message'
          }
          leftAdornment={
            isRealtime ? (
              <ChatImageUploadButton
                conversationId={conversationId!}
                myUserId={myUserId!}
                onLocalPreview={handleLocalPreview}
                onUploaded={handleUploadDone}
                onFailed={handleUploadFail}
              />
            ) : (
              <button
                type="button"
                className="h-11 w-11 flex items-center justify-center rounded-full bg-muted opacity-50 shrink-0"
                disabled
                aria-label="Add image"
              >
                <Send size={20} className="text-muted-foreground" />
              </button>
            )
          }
        />
      )}

      {isRealtime && (
        <ChatBookingProposeSheet
          isOpen={proposeOpen}
          onClose={() => setProposeOpen(false)}
          conversationId={conversationId!}
          myUserId={myUserId!}
        />
      )}
      {reviewBooking && user && (
        <ChatReviewSheet
          isOpen={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          swapId={reviewBooking.swap_id}
          otherUserId={user.id}
          otherFirstName={user.firstName}
        />
      )}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <ChatDebugPanel
        conversationId={conversationId}
        currentUserId={myUserId}
        receiverId={receiverId}
        state={debugState}
      />
    </div>
  );
};

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId: pathUserId } = useParams<{ userId?: string }>();
  const userParam = pathUserId ?? searchParams.get('user');
  const [selectedChat, setSelectedChat] = useState<string | null>(userParam ?? null);

  useEffect(() => {
    if (userParam && userParam !== selectedChat) {
      setSelectedChat(userParam);
    }
  }, [userParam, selectedChat]);

  const handleBack = () => {
    setSelectedChat(null);
    if (searchParams.has('user')) {
      searchParams.delete('user');
      setSearchParams(searchParams, { replace: true });
    }
  };

  if (selectedChat) {
    return <ChatView userId={selectedChat} onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-7 pb-4 safe-top">
        <h1 className="text-[34px] font-bold tracking-tight leading-none">Messages</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1.5">Stay close to your trusted neighbours.</p>
      </div>
      <ChatList onSelect={setSelectedChat} />
      <BottomNav />
    </div>
  );
};

export default Chat;

// Type re-export silenced — keeps tree-shaking happy with strict TS.
export type { RealtimeMessage };
