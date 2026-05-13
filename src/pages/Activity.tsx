import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  MessageCircle,
  UserPlus,
  Trophy,
  Coins,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import SegmentedControl from '@/components/SegmentedControl';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { useCreditsLedger, type CreditTx } from '@/hooks/useCreditsLedger';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { useMyProfile, useMyProfile as _ } from '@/hooks/useMyProfile';
import { supabase } from '@/integrations/supabase/client';
import { notifyNewMatch } from '@/lib/notifyNewMatch';

type Tab = 'upcoming' | 'credits' | 'reviews' | 'network';

const tabOptions: { id: Tab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'credits', label: 'Credits' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'network', label: 'Network' },
];

const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ────────────────────────────────────────────────────────────────────────────
// UPCOMING — real swaps from DB
// ────────────────────────────────────────────────────────────────────────────
interface UpcomingSwap {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  credits_amount: number;
  pet_name: string | null;
  other_name: string | null;
  other_id: string;
  other_avatar: string | null;
}

const UpcomingTab = ({ userId }: { userId: string | null }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<UpcomingSwap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setItems([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: swaps } = await supabase
        .from('swaps')
        .select('id, owner_id, helper_id, pet_id, start_at, end_at, status, credits_amount')
        .or(`owner_id.eq.${userId},helper_id.eq.${userId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('end_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(20);
      if (cancelled) return;
      const rows = swaps ?? [];
      const otherIds = Array.from(new Set(rows.map((s) => (s.owner_id === userId ? s.helper_id : s.owner_id))));
      const petIds = Array.from(new Set(rows.map((s) => s.pet_id).filter(Boolean)));

      const [profilesRes, petsRes] = await Promise.all([
        otherIds.length ? supabase.from('profiles').select('id, first_name, avatar_url').in('id', otherIds) : Promise.resolve({ data: [] }),
        petIds.length ? supabase.from('pets').select('id, name').in('id', petIds) : Promise.resolve({ data: [] }),
      ]);
      const pmap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.id, p]));
      const petMap = Object.fromEntries((petsRes.data ?? []).map((p) => [p.id, p]));

      setItems(rows.map((s) => {
        const otherId = s.owner_id === userId ? s.helper_id : s.owner_id;
        const other = pmap[otherId];
        return {
          id: s.id,
          start_at: s.start_at,
          end_at: s.end_at,
          status: s.status,
          credits_amount: s.credits_amount,
          pet_name: petMap[s.pet_id]?.name ?? null,
          other_name: other?.first_name ?? null,
          other_id: otherId,
          other_avatar: other?.avatar_url ?? null,
        };
      }));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <div className="text-center text-[13px] text-muted-foreground py-12">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        emoji="📅"
        title="No bookings planned"
        description="Your scheduled care will appear here as a clean timeline."
        actionLabel="Find a request"
        onAction={() => navigate('/explore')}
      />
    );
  }

  return (
    <div className="relative pl-5 stagger">
      <span className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
      {items.map((it) => {
        const start = new Date(it.start_at);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
        const isToday = startDay.getTime() === today.getTime();
        return (
          <div key={it.id} className="relative pb-5 last:pb-0">
            <span
              className={cn(
                'absolute -left-[18px] top-6 w-3 h-3 rounded-full ring-2 ring-background',
                isToday ? 'bg-warning' : 'bg-primary',
              )}
              aria-hidden
            />
            <div className="card-elevated card-lift p-[18px]">
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full',
                  isToday ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary',
                )}>
                  <Clock size={11} />
                  {isToday ? 'Today' : start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <UserAvatar name={it.other_name ?? 'Member'} src={it.other_avatar ?? undefined} size={48} rounded={12} />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold tracking-tight truncate">
                    {it.pet_name ?? 'Care booking'}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> {start.toLocaleDateString('en-GB', { weekday: 'long' })}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    with {it.other_name ?? 'a neighbour'}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[13px] font-bold text-warning">
                  <Star size={13} fill="currentColor" /> {it.credits_amount}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/messages?user=${it.other_id}`)}
                  className="btn-outline flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={14} /> Message
                </button>
                <button
                  onClick={() => navigate(`/bookings/${it.id}`)}
                  className="btn-primary flex-1 text-[13px] py-2.5"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// CREDITS — real ledger
// ────────────────────────────────────────────────────────────────────────────
const careRates: Array<{ label: string; credits: number }> = [
  { label: 'Walk', credits: 1 },
  { label: 'Feeding visit', credits: 1 },
  { label: 'Day care', credits: 3 },
  { label: 'Overnight', credits: 4 },
];

const CreditsTab = () => {
  const { summary, transactions, loading } = useCreditsLedger();

  const cumulative = useMemo(() => {
    if (!transactions.length) return [0, summary.balance];
    return [...transactions].reverse().map((t) => t.balance_after);
  }, [transactions, summary.balance]);

  const max = Math.max(...cumulative, 1);
  const min = Math.min(...cumulative, 0);
  const range = Math.max(max - min, 1);
  const points = cumulative
    .map((v, i) => `${(i / Math.max(cumulative.length - 1, 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(' ');

  return (
    <div className="space-y-[18px] animate-fade-in">
      <div className="card-elevated p-[22px] relative overflow-hidden">
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.25), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Available balance
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{summary.balance}</span>
            <span className="text-[14px] text-muted-foreground">credits</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div><p className="text-[11px] text-muted-foreground font-medium">Earned</p>
              <p className="text-[18px] font-bold text-success tabular-nums mt-0.5">+{summary.earned}</p></div>
            <div><p className="text-[11px] text-muted-foreground font-medium">Spent</p>
              <p className="text-[18px] font-bold text-foreground/70 tabular-nums mt-0.5">−{summary.spent}</p></div>
            <div><p className="text-[11px] text-muted-foreground font-medium">Bonus</p>
              <p className="text-[18px] font-bold text-warning tabular-nums mt-0.5">+{summary.bonus}</p></div>
          </div>
          {transactions.length >= 2 && (
            <div className="mt-5 h-[58px] w-full">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="actSparkFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline fill="url(#actSparkFill)" stroke="none" points={`0,100 ${points} 100,100`} />
                <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={points} />
              </svg>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">Credits earned over time</p>
        </div>
      </div>

      <div className="card-flat p-[18px]">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={15} className="text-primary" />
          <p className="font-semibold text-[14px]">Standard rates</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {careRates.map((r) => (
            <div key={r.label} className="bg-card rounded-2xl p-3 flex items-center justify-between ring-1 ring-border/40">
              <span className="text-[13px] font-medium">{r.label}</span>
              <span className="inline-flex items-center gap-1 text-[13px] font-bold text-warning tabular-nums">
                <Star size={12} fill="currentColor" />
                {r.credits}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="font-bold text-[16px]">Recent activity</p>
          <span className="text-[11px] text-muted-foreground">{transactions.length} entries</span>
        </div>
        {loading ? (
          <div className="text-center text-[13px] text-muted-foreground py-8">Loading…</div>
        ) : transactions.length === 0 ? (
          <EmptyState
            emoji="🪙"
            title="No credit movement yet"
            description="Help a neighbour or invite a friend to start earning."
          />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: CreditTx) => {
              const isEarned = tx.amount > 0;
              return (
                <div key={tx.id} className="card-elevated p-3.5 flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    isEarned ? 'bg-success/10' : 'bg-muted',
                  )}>
                    {isEarned ? <TrendingUp size={17} className="text-success" /> : <TrendingDown size={17} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] truncate">{tx.description ?? 'Credit movement'}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{formatRelative(tx.created_at)}</p>
                  </div>
                  <span className={cn(
                    'font-bold text-[15px] tabular-nums flex-shrink-0',
                    isEarned ? 'text-success' : 'text-foreground/70',
                  )}>
                    {isEarned ? '+' : '−'}{Math.abs(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// REVIEWS — real reviews
// ────────────────────────────────────────────────────────────────────────────
const ReviewsTab = ({ userId }: { userId: string | null }) => {
  const navigate = useNavigate();
  const { reviews, loading } = useMyProfile(userId);

  if (loading) return <div className="text-center text-[13px] text-muted-foreground py-12">Loading…</div>;
  if (!userId || reviews.length === 0) {
    return (
      <EmptyState
        emoji="⭐"
        title="No reviews yet"
        description="Complete swaps to collect trust from neighbours."
        actionLabel="Find help"
        onAction={() => navigate('/explore')}
      />
    );
  }

  const total = reviews.length;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));

  return (
    <div className="space-y-[18px] animate-fade-in">
      <div className="card-elevated p-[22px]">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{avg.toFixed(1)}</p>
            <div className="flex items-center gap-0.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15}
                  className={i < Math.round(avg) ? 'text-warning' : 'text-border'}
                  fill={i < Math.round(avg) ? 'currentColor' : 'none'} />
              ))}
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-1.5">{total} review{total === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums w-3">{d.star}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-warning rounded-full transition-all duration-500"
                  style={{ width: `${(d.count / Math.max(total, 1)) * 100}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums w-5 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 stagger">
        {reviews.map((review) => (
          <div key={review.id} className="card-elevated p-[18px]">
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar name={review.reviewer_name ?? 'Member'} src={review.reviewer_avatar ?? undefined} size={44} rounded={22} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14.5px] truncate">{review.reviewer_name ?? 'Anonymous'}</p>
                <p className="text-[11.5px] text-muted-foreground">{formatRelative(review.created_at)}</p>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13}
                    className={i < review.rating ? 'text-warning' : 'text-border'}
                    fill={i < review.rating ? 'currentColor' : 'none'} />
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-[14px] text-foreground/85 leading-relaxed mb-3">"{review.comment}"</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold bg-success/10 text-success px-2 py-1 rounded-full">
                <ShieldCheck size={10} /> Verified swap
              </span>
              {review.tags.map((tag) => (
                <span key={tag} className="text-[10.5px] bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// NETWORK — real connections
// ────────────────────────────────────────────────────────────────────────────
interface ConnRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  request_message: string | null;
  created_at: string;
}
interface ProfileLite { id: string; first_name: string | null; avatar_url: string | null; area: string | null; }

const NetworkTab = ({ userId }: { userId: string | null }) => {
  const navigate = useNavigate();
  const [conns, setConns] = useState<ConnRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('connections')
        .select('id, requester_id, recipient_id, status, request_message, created_at')
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(40);
      if (cancelled) return;
      const rows = (data ?? []) as ConnRow[];
      setConns(rows);
      const ids = Array.from(new Set(rows.flatMap((c) => [c.requester_id, c.recipient_id])));
      if (ids.length) {
        const { data: ps } = await supabase
          .from('profiles')
          .select('id, first_name, avatar_url, area')
          .in('id', ids);
        if (!cancelled) setProfiles(Object.fromEntries(((ps ?? []) as ProfileLite[]).map((p) => [p.id, p])));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="text-center text-[13px] text-muted-foreground py-12">Loading…</div>;

  const pending = conns.filter((c) => c.status === 'pending' && c.recipient_id === userId);
  const accepted = conns.filter((c) => c.status === 'accepted');

  if (pending.length === 0 && accepted.length === 0) {
    return (
      <EmptyState
        emoji="🤝"
        title="No connections yet"
        description="Nearby pet lovers will appear here as you start helping out."
        actionLabel="Explore"
        onAction={() => navigate('/explore')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="font-bold text-[15px]">Requests</p>
            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {pending.length} new
            </span>
          </div>
          <div className="space-y-3 stagger">
            {pending.map((conn) => {
              const requester = profiles[conn.requester_id];
              return (
                <div key={conn.id} className="card-elevated p-[18px]">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar name={requester?.first_name ?? 'Member'} src={requester?.avatar_url ?? undefined} size={48} rounded={24} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] truncate">{requester?.first_name ?? 'Member'}</p>
                      <p className="text-[12.5px] text-muted-foreground truncate">{requester?.area ?? '—'}</p>
                    </div>
                  </div>
                  {conn.request_message && (
                    <p className="text-[13px] text-foreground/80 mb-4 leading-relaxed">"{conn.request_message}"</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => supabase.rpc('decline_connection', { _connection_id: conn.id }).then(() => setConns((v) => v.filter((x) => x.id !== conn.id)))}
                      className="btn-outline flex-1 text-[13.5px] py-2.5"
                    >Pass</button>
                    <button
                      onClick={async () => {
                        const { error } = await supabase.rpc('accept_connection', { _connection_id: conn.id });
                        if (error) return;
                        setConns((v) => v.map((x) => x.id === conn.id ? { ...x, status: 'accepted' } : x));
                        // Micro-reward: subtle celebration on match accept.
                        window.dispatchEvent(new CustomEvent('petswap:celebrate', { detail: { kind: 'match' } }));

                        // Notify BOTH users of the new match (server-side dedupe per connection).
                        if (userId) {
                          void notifyNewMatch({
                            matchKey: `conn-${conn.id}`,
                            userAId: conn.requester_id,
                            userBId: userId,
                            chatUrlForA: `https://petswap.co.uk/chat/${userId}`,
                            chatUrlForB: `https://petswap.co.uk/chat/${conn.requester_id}`,
                          });
                        }
                      }}
                      className="btn-primary flex-1 text-[13.5px] py-2.5"
                    >Accept</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section>
          <p className="font-bold text-[15px] mb-3 px-1">Connected</p>
          <div className="space-y-2 stagger">
            {accepted.map((conn) => {
              const otherId = conn.requester_id === userId ? conn.recipient_id : conn.requester_id;
              const other = profiles[otherId];
              return (
                <div key={conn.id} className="card-elevated card-lift p-3.5 flex items-center gap-3">
                  <UserAvatar name={other?.first_name ?? 'Member'} src={other?.avatar_url ?? undefined} size={44} rounded={22} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px] truncate">{other?.first_name ?? 'Member'}</p>
                    <p className="text-[11.5px] text-muted-foreground truncate">{other?.area ?? '—'}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/messages?user=${otherId}`)}
                    className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 active:scale-[0.97] transition-transform"
                  >
                    <MessageCircle size={12} /> Message
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button
        onClick={() => navigate('/explore')}
        className="btn-outline w-full text-[14px] py-3 inline-flex items-center justify-center gap-2"
      >
        <UserPlus size={14} /> Discover more neighbours
      </button>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT STRIP — real completed_swaps
// ────────────────────────────────────────────────────────────────────────────
const AchievementStrip = ({ userId }: { userId: string | null }) => {
  const { profile } = useMyProfile(userId);
  const completed = profile?.completed_swaps ?? 0;
  const items = [
    { label: 'First swap', unlocked: completed >= 1, icon: '🐾' },
    { label: '5 happy pets', unlocked: completed >= 5, icon: '💛' },
    { label: '10+ helps', unlocked: completed >= 10, icon: '⭐' },
    { label: 'Local hero', unlocked: completed >= 25, icon: '🏆' },
  ];

  return (
    <div className="px-5 mt-3">
      <div className="card-flat p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Trophy size={13} className="text-warning" />
            <p className="text-[12px] font-bold uppercase tracking-wider text-foreground/80">Your streak</p>
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{completed} swaps</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
          {items.map((it) => (
            <div key={it.label} className={cn(
              'flex-shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-semibold',
              it.unlocked ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground/70',
            )}>
              <span className={cn(!it.unlocked && 'grayscale opacity-60')}>{it.icon}</span>
              {it.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Activity = () => {
  const [tab, setTab] = useState<Tab>('upcoming');
  const userId = useCurrentUserId();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-7 pb-2 safe-top">
        <h1 className="text-[34px] font-bold tracking-tight leading-none">Activity</h1>
        <p className="text-[13.5px] text-muted-foreground mt-1.5">
          Your bookings, credits and trust — all in one place.
        </p>
      </div>

      <AchievementStrip userId={userId} />

      <div className="px-5 mt-4 mb-2">
        <SegmentedControl options={tabOptions} value={tab} onChange={(v) => setTab(v as Tab)} />
      </div>

      <div className="px-5 mt-4">
        {tab === 'upcoming' && <UpcomingTab userId={userId} />}
        {tab === 'credits' && <CreditsTab />}
        {tab === 'reviews' && <ReviewsTab userId={userId} />}
        {tab === 'network' && <NetworkTab userId={userId} />}
      </div>

      <BottomNav />
    </div>
  );
};

export default Activity;
