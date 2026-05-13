import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Sparkles,
  HandHeart,
  Gift,
  Zap,
  ShieldCheck,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import CreditBalanceCard from '@/components/CreditBalanceCard';
import InviteSheet from '@/components/InviteSheet';
import QuickRequestSheet from '@/components/QuickRequestSheet';
import { useCreditsLedger, type CreditTx } from '@/hooks/useCreditsLedger';
import { careTypeCredits, careTypeLabels } from '@/data/mockData';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'earned' | 'spent' | 'bonus';

const reasonLabel: Record<CreditTx['reason'], string> = {
  swap_completed: 'Swap completed',
  referral_bonus: 'Referral bonus',
  signup_bonus: 'Welcome bonus',
  daily_login: 'Daily login',
  premium_boost: 'Premium boost',
  request_posted: 'Request posted',
  request_cancelled: 'Request cancelled',
  manual_adjustment: 'Adjustment',
};

const groupByDate = (txs: CreditTx[]) => {
  const groups: Record<string, CreditTx[]> = {};
  txs.forEach(tx => {
    const date = new Date(tx.created_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const txDay = new Date(date);
    txDay.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - txDay.getTime()) / (1000 * 60 * 60 * 24);
    let key: string;
    if (diff === 0) key = 'Today';
    else if (diff === 1) key = 'Yesterday';
    else if (diff < 7) key = 'This week';
    else if (diff < 30) key = 'This month';
    else key = 'Earlier';
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
};

const TxIcon = ({ tx }: { tx: CreditTx }) => {
  const map: Record<CreditTx['reason'], { icon: typeof Star; color: string; bg: string }> = {
    swap_completed:
      tx.amount > 0
        ? { icon: HandHeart, color: 'text-success', bg: 'bg-success/10' }
        : { icon: Star, color: 'text-foreground/70', bg: 'bg-muted' },
    referral_bonus: { icon: Gift, color: 'text-primary', bg: 'bg-primary/10' },
    signup_bonus: { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
    daily_login: { icon: Zap, color: 'text-warning', bg: 'bg-warning/15' },
    premium_boost: { icon: Sparkles, color: 'text-premium', bg: 'bg-premium/15' },
    request_posted: { icon: Plus, color: 'text-foreground/70', bg: 'bg-muted' },
    request_cancelled: { icon: Minus, color: 'text-foreground/70', bg: 'bg-muted' },
    manual_adjustment: { icon: Star, color: 'text-foreground/70', bg: 'bg-muted' },
  };
  const { icon: Icon, color, bg } = map[tx.reason];
  return (
    <div className={cn('w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0', bg)}>
      <Icon size={18} className={color} />
    </div>
  );
};

const Credits = () => {
  const navigate = useNavigate();
  const { summary, transactions, loading } = useCreditsLedger();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const myUserId = useCurrentUserId();
  const { profile: myProfile } = useMyProfile(myUserId);
  const isPremium = myProfile?.subscription_tier === 'premium';

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupOrder = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier'];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 safe-top flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center transition-all active:scale-[0.95]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="heading-lg leading-tight">Credits</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Help now, get help later</p>
        </div>
      </div>

      {/* Big balance card */}
      <div className="px-6 mt-3">
        <CreditBalanceCard
          balance={summary.balance}
          earned={summary.earned}
          spent={summary.spent}
          bonus={summary.bonus}
          isPremium={isPremium}
          variant="full"
        />
      </div>

      {/* Earn / Spend explainer */}
      <div className="px-6 mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/explore')}
          className="card-flat p-4 text-left transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-md bg-success/10 flex items-center justify-center mb-2">
            <HandHeart size={18} className="text-success" />
          </div>
          <p className="font-semibold text-[13px]">Earn credits</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Help a neighbour with their pet</p>
        </button>
        <button
          onClick={() => setRequestOpen(true)}
          className="card-flat p-4 text-left transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-2">
            <Star size={18} className="text-primary" fill="currentColor" />
          </div>
          <p className="font-semibold text-[13px]">Spend credits</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Request care from a trusted helper</p>
        </button>
      </div>

      {/* Earn faster */}
      <div className="px-6 mt-4 space-y-2.5">
        <button
          onClick={() => setInviteOpen(true)}
          className="card-elevated p-4 w-full flex items-center gap-3 bg-primary/5 transition-all active:scale-[0.99] text-left"
        >
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Gift size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[14px]">Invite friends · earn 2 credits</p>
            <p className="text-[11px] text-muted-foreground">
              Both earn 2 credits after their first swap
            </p>
          </div>
          <ArrowRight size={15} className="text-muted-foreground" />
        </button>

        {!isPremium && (
          <button
            onClick={() => navigate('/subscription')}
            className="card-elevated p-4 w-full flex items-center gap-3 transition-all active:scale-[0.99] text-left"
            style={{ background: 'linear-gradient(135deg, hsl(var(--premium) / 0.08), hsl(var(--premium) / 0.03))' }}
          >
            <div className="w-10 h-10 rounded-md bg-premium/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-premium" fill="currentColor" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px]">Earn 25% more with Premium</p>
              <p className="text-[11px] text-muted-foreground">
                Bonus credits on every swap you complete
              </p>
            </div>
            <ArrowRight size={15} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Care rate card */}
      <div className="px-6 mt-5">
        <div className="card-flat p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={15} className="text-primary" />
            <p className="font-semibold text-[13px]">Standard rates</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            {(Object.keys(careTypeCredits) as Array<keyof typeof careTypeCredits>).map(k => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-muted-foreground">{careTypeLabels[k]}</span>
                <span className="font-semibold tabular-nums">{careTypeCredits[k]} cr</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[16px]">History</h2>
          <span className="text-[11px] text-muted-foreground">
            {transactions.length} entr{transactions.length === 1 ? 'y' : 'ies'}
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
          {(['all', 'earned', 'spent', 'bonus'] as FilterTab[]).map(t => {
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-all active:scale-[0.96]',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground/70 hover:bg-muted/80',
                )}
              >
                {t}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="card-flat p-3 h-14 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-flat p-8 text-center">
            <Sparkles size={28} className="text-primary mx-auto mb-2" />
            <p className="font-semibold text-[14px]">No transactions yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Your earnings and spends will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupOrder
              .filter(g => grouped[g])
              .map(g => (
                <div key={g}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {g}
                  </p>
                  <div className="space-y-2">
                    {grouped[g].map(tx => (
                      <div key={tx.id} className="card-flat p-3 flex items-center gap-3">
                        <TxIcon tx={tx} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[13px] truncate">
                            {reasonLabel[tx.reason]}
                          </p>
                          {tx.description && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {tx.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className={cn(
                              'font-bold text-[14px] tabular-nums',
                              tx.amount > 0 ? 'text-success' : 'text-foreground/70',
                            )}
                          >
                            {tx.amount > 0 ? '+' : ''}
                            {tx.amount}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            bal {tx.balance_after}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <QuickRequestSheet isOpen={requestOpen} onClose={() => setRequestOpen(false)} />
      <InviteSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <BottomNav />
    </div>
  );
};

export default Credits;
