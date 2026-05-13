/**
 * Real-only notification feed.
 *
 * Composes feed items strictly from authenticated DB rows:
 *   • Pending connection requests addressed to me
 *   • Unread chat messages (latest per conversation)
 *   • Credit movements within the last 7 days
 *
 * Local-only state (read / dismissed / prefs) lives in localStorage.
 * No mock users, no fabricated "trust score updated" entries — if there's
 * nothing real to show, the feed is intentionally empty.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NotificationKind =
  | 'connection_request'
  | 'reply'
  | 'credits_earned';

export interface FeedItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  ts: number;
  read: boolean;
  link?: string;
  avatarUserId?: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
}

export interface NotificationPrefs {
  connection_request: boolean;
  reply: boolean;
  credits_earned: boolean;
  quietHours: boolean;
}

const READ_KEY = 'petswap.notifications.read.v3';
const DISMISSED_KEY = 'petswap.notifications.dismissed.v3';
const PREFS_KEY = 'petswap.notifications.prefs.v3';

const DEFAULT_PREFS: NotificationPrefs = {
  connection_request: true,
  reply: true,
  credits_earned: true,
  quietHours: true,
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const getReadIds = (): Set<string> => new Set(readJson<string[]>(READ_KEY, []));
const getDismissed = (): Set<string> => new Set(readJson<string[]>(DISMISSED_KEY, []));
const getPrefs = (): NotificationPrefs => ({ ...DEFAULT_PREFS, ...readJson<Partial<NotificationPrefs>>(PREFS_KEY, {}) });

// ---------- Reactive local store (read/dismissed/prefs only) ----------
const listeners = new Set<() => void>();
type LocalSnapshot = {
  read: Set<string>;
  dismissed: Set<string>;
  prefs: NotificationPrefs;
  rev: number;
};
let snapshot: LocalSnapshot = {
  read: getReadIds(),
  dismissed: getDismissed(),
  prefs: getPrefs(),
  rev: 0,
};
const refresh = () => {
  snapshot = {
    read: getReadIds(),
    dismissed: getDismissed(),
    prefs: getPrefs(),
    rev: snapshot.rev + 1,
  };
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => snapshot;

// ---------- Mutations ----------
export const markRead = (id: string) => {
  const ids = getReadIds(); ids.add(id);
  writeJson(READ_KEY, [...ids]); refresh();
};
export const markAllRead = (ids: string[]) => {
  const set = getReadIds(); ids.forEach((i) => set.add(i));
  writeJson(READ_KEY, [...set]); refresh();
};
export const dismissNotification = (id: string) => {
  const set = getDismissed(); set.add(id);
  writeJson(DISMISSED_KEY, [...set]); refresh();
};
export const updatePrefs = (patch: Partial<NotificationPrefs>) => {
  const next = { ...getPrefs(), ...patch };
  writeJson(PREFS_KEY, next); refresh();
};
export const resetNotificationsForTesting = () => {
  if (typeof window === 'undefined') return;
  [READ_KEY, DISMISSED_KEY].forEach((k) => localStorage.removeItem(k));
  refresh();
};
/** Back-compat no-op: cooldown logic was tied to fabricated discovery items. */
export const touchCooldown = (_kind: NotificationKind) => { /* noop */ };

// ---------- Real-data fetcher ----------
interface RawSources {
  connections: Array<{ id: string; requester_id: string; request_message: string | null; created_at: string }>;
  unreadMessages: Array<{ id: string; conversation_id: string; sender_id: string; body: string; created_at: string }>;
  recentCredits: Array<{ id: string; amount: number; type: string; description: string | null; created_at: string }>;
  profileMap: Record<string, { first_name: string | null; avatar_url: string | null }>;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const fetchSources = async (uid: string): Promise<RawSources> => {
  const sevenDaysIso = new Date(Date.now() - SEVEN_DAYS).toISOString();

  const [connRes, unreadRes, creditsRes] = await Promise.all([
    supabase
      .from('connections')
      .select('id, requester_id, request_message, created_at')
      .eq('recipient_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .neq('sender_id', uid)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('credit_transactions')
      .select('id, amount, type, description, created_at')
      .eq('user_id', uid)
      .gte('created_at', sevenDaysIso)
      .in('type', ['earned', 'bonus'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const connections = connRes.data ?? [];
  const unreadMessages = unreadRes.data ?? [];
  const recentCredits = creditsRes.data ?? [];

  const senderIds = Array.from(new Set([
    ...connections.map((c) => c.requester_id),
    ...unreadMessages.map((m) => m.sender_id),
  ]));

  let profileMap: RawSources['profileMap'] = {};
  if (senderIds.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, avatar_url')
      .in('id', senderIds);
    profileMap = Object.fromEntries(
      (data ?? []).map((p) => [p.id, { first_name: p.first_name, avatar_url: p.avatar_url }]),
    );
  }

  return { connections, unreadMessages, recentCredits, profileMap };
};

const buildFeed = (sources: RawSources, local: LocalSnapshot): FeedItem[] => {
  const items: FeedItem[] = [];

  if (local.prefs.connection_request) {
    sources.connections.forEach((c) => {
      const u = sources.profileMap[c.requester_id];
      const name = (u?.first_name ?? '').trim() || 'Someone';
      const id = `conn-${c.id}`;
      items.push({
        id,
        kind: 'connection_request',
        title: `${name} wants to connect`,
        body: c.request_message ?? 'They sent you a connection request.',
        createdAt: c.created_at,
        ts: new Date(c.created_at).getTime(),
        read: local.read.has(id),
        link: '/activity',
        avatarUserId: c.requester_id,
        avatarUrl: u?.avatar_url ?? null,
        avatarName: name,
      });
    });
  }

  if (local.prefs.reply) {
    // Coalesce one entry per conversation — newest unread message wins.
    const byConv = new Map<string, RawSources['unreadMessages'][number]>();
    sources.unreadMessages.forEach((m) => {
      if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, m);
    });
    byConv.forEach((m, conv) => {
      const u = sources.profileMap[m.sender_id];
      const name = (u?.first_name ?? '').trim() || 'Someone';
      const id = `reply-${conv}-${m.id}`;
      items.push({
        id,
        kind: 'reply',
        title: `${name} replied`,
        body: m.body,
        createdAt: m.created_at,
        ts: new Date(m.created_at).getTime(),
        read: local.read.has(id),
        link: '/messages',
        avatarUserId: m.sender_id,
        avatarUrl: u?.avatar_url ?? null,
        avatarName: name,
      });
    });
  }

  if (local.prefs.credits_earned) {
    sources.recentCredits.forEach((c) => {
      const id = `credit-${c.id}`;
      const amt = Math.abs(c.amount);
      items.push({
        id,
        kind: 'credits_earned',
        title: `You earned ${amt} credit${amt === 1 ? '' : 's'}`,
        body: c.description ?? 'Credit added to your balance.',
        createdAt: c.created_at,
        ts: new Date(c.created_at).getTime(),
        read: local.read.has(id),
        link: '/credits',
      });
    });
  }

  return items
    .filter((i) => !local.dismissed.has(i.id))
    .sort((a, b) => b.ts - a.ts);
};

// ---------- Hooks ----------
const EMPTY_SOURCES: RawSources = { connections: [], unreadMessages: [], recentCredits: [], profileMap: {} };

export const useNotificationFeed = (): { items: FeedItem[]; unread: number; loading: boolean } => {
  const local = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [sources, setSources] = useState<RawSources>(EMPTY_SOURCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) { if (!cancelled) { setSources(EMPTY_SOURCES); setLoading(false); } return; }
      try {
        const next = await fetchSources(uid);
        if (!cancelled) setSources(next);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setLoading(true); load(); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return useMemo(() => {
    const items = buildFeed(sources, local);
    return { items, unread: items.filter((i) => !i.read).length, loading };
  }, [sources, local, loading]);
};

export const useNotificationPrefs = (): {
  prefs: NotificationPrefs;
  setPref: (k: keyof NotificationPrefs, v: boolean) => void;
} => {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    prefs: s.prefs,
    setPref: (k, v) => updatePrefs({ [k]: v } as Partial<NotificationPrefs>),
  };
};

export const NOTIFICATION_KIND_LABELS: Record<keyof Omit<NotificationPrefs, 'quietHours'>, string> = {
  connection_request: 'Connection requests',
  reply: 'Replies in your chats',
  credits_earned: 'Credits earned',
};
