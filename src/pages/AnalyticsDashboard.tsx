import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Users,
  Heart,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  Calendar,
  Sparkles,
  Crown,
  Zap,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import SectionHeader from '@/components/SectionHeader';
import { useAnalyticsSummary } from '@/lib/analyticsStore';
import { usePersonalization, leanLabel } from '@/lib/personalizationStore';
import { useFavouriteIds } from '@/lib/favouritesStore';
import { useInbox } from '@/lib/inboxStore';
import { cn } from '@/lib/utils';

interface StatProps {
  icon: typeof Activity;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'primary' | 'warning';
}

const Stat = ({ icon: Icon, label, value, hint, tone = 'default' }: StatProps) => (
  <div className="card-elevated p-4">
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0',
          tone === 'primary' && 'bg-primary/10 text-primary',
          tone === 'warning' && 'bg-warning/10 text-warning',
          tone === 'default' && 'bg-muted text-foreground',
        )}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="font-bold text-[22px] leading-tight mt-0.5 tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  </div>
);

const Sparkline = ({ data }: { data: { day: string; opens: number }[] }) => {
  const max = Math.max(...data.map(d => d.opens), 1);
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Daily opens
          </p>
          <p className="font-semibold text-[15px] mt-0.5">Last 14 days</p>
        </div>
        <TrendingUp size={18} className="text-primary" />
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d, i) => {
          const h = Math.round((d.opens / max) * 100);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className={cn(
                  'w-full rounded-sm transition-all',
                  d.opens > 0 ? 'bg-primary' : 'bg-muted',
                )}
                style={{ height: `${Math.max(h, 4)}%` }}
                title={`${d.day}: ${d.opens} open${d.opens === 1 ? '' : 's'}`}
              />
              {i === data.length - 1 && (
                <span className="text-[9px] text-muted-foreground">Today</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const summary = useAnalyticsSummary();
  const { lean, counters } = usePersonalization();
  const favouriteIds = useFavouriteIds();
  const inbox = useInbox();

  const helperBookings = Object.values(inbox.bookings).filter(b => b.helperId === 'me');
  const completedHelperBookings = helperBookings.filter(b => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 safe-top flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-md bg-muted flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="heading-lg leading-tight">Analytics</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            How you and the community are using PetSwap
          </p>
        </div>
      </div>

      {/* Lean badge */}
      <div className="px-6 mb-5">
        <div className="card-flat p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Your role
            </p>
            <p className="font-semibold text-[14px]">{leanLabel(lean)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {counters.ownerIntent} owner action{counters.ownerIntent === 1 ? '' : 's'} ·{' '}
              {counters.helperIntent} helper action{counters.helperIntent === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="px-6 mb-6">
        <SectionHeader title="Activity" subtitle="Daily, weekly and monthly opens" />
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={Activity} label="DAU" value={summary.dau} tone="primary" />
          <Stat icon={Calendar} label="WAU" value={summary.wau} hint="Last 7 days" />
          <Stat icon={Users} label="MAU" value={summary.mau} hint="Last 30 days" />
        </div>
      </div>

      {/* Series */}
      <div className="px-6 mb-6">
        <Sparkline data={summary.series} />
      </div>

      {/* Engagement */}
      <div className="px-6 mb-6">
        <SectionHeader title="Engagement" subtitle="What you do once you're here" />
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={RotateCcw}
            label="Repeat bookings"
            value={summary.repeatBookings}
            hint="One-tap rebook of saved helpers"
            tone="primary"
          />
          <Stat
            icon={Heart}
            label="Favourites used"
            value={summary.favouritesUsed}
            hint={`${favouriteIds.length} saved`}
          />
          <Stat
            icon={CheckCircle2}
            label="Request completion"
            value={`${summary.completionRate}%`}
            hint={`${summary.requestsCompleted} of ${summary.requestsSent} sent`}
            tone={summary.completionRate >= 60 ? 'primary' : 'warning'}
          />
          <Stat
            icon={Users}
            label="Bookings as helper"
            value={completedHelperBookings}
            hint={`${helperBookings.length} accepted total`}
          />
        </div>
      </div>

      {/* Revenue funnel */}
      <div className="px-6 mb-6">
        <SectionHeader title="Revenue funnel" subtitle="Subscription views, taps, conversions" />
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={Crown}
            label="Sub views"
            value={summary.subscriptionViews}
            hint={`${summary.subscriptionTaps} tap${summary.subscriptionTaps === 1 ? '' : 's'}`}
            tone="primary"
          />
          <Stat
            icon={CheckCircle2}
            label="Conversions"
            value={summary.subscriptionsConverted}
            hint={`${summary.subscriptionConversionRate}% of viewers`}
            tone={summary.subscriptionConversionRate >= 5 ? 'primary' : 'default'}
          />
          <Stat
            icon={Zap}
            label="Boosts activated"
            value={summary.boostsActivated}
            hint="24h request boosts"
            tone="warning"
          />
          <Stat
            icon={TrendingUp}
            label="Tap-through rate"
            value={
              summary.subscriptionViews === 0
                ? '0%'
                : `${Math.round((summary.subscriptionTaps / summary.subscriptionViews) * 100)}%`
            }
            hint="View → upgrade tap"
          />
        </div>
      </div>

      {/* Retention */}
      <div className="px-6 mb-8">
        <SectionHeader title="Retention" subtitle="How often the community returns" />
        <div className="grid grid-cols-2 gap-3">
          <Stat
            icon={TrendingUp}
            label="7-day retention"
            value={`${summary.retention7}%`}
            hint="Active days in last week"
            tone="primary"
          />
          <Stat
            icon={TrendingUp}
            label="30-day retention"
            value={`${summary.retention30}%`}
            hint="Active days in last month"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Retention reflects unique active days within each window. The more
          consistent you are, the higher this rises — no spammy nudges required.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default AnalyticsDashboard;
