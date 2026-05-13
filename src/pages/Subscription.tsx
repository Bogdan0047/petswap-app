import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  Zap,
  Heart,
  Headphones,
  Shield,
  Loader2,
  TrendingUp,
  Target,
  Lock,
  PawPrint,
  X,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analyticsStore';
import { friendlyError } from '@/lib/friendlyError';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import LazySection from '@/components/LazySection';
import petswapIcon from '@/assets/petswap-icon.png';
import { useSubscription } from '@/hooks/useSubscription';
import { openPaywall } from '@/lib/paywallStore';
import { supabase } from '@/integrations/supabase/client';
import { getStripeEnvironment, PRICE_IDS } from '@/lib/stripe';
import CancelDefenseSheet from '@/components/CancelDefenseSheet';

type Cycle = 'monthly' | 'yearly';

const MONTHLY_PRICE_ID = 'trusted_plus_monthly';
const YEARLY_PRICE_ID = 'trusted_plus_yearly';

const PRICES: Record<Cycle, { cta: string; short: string; priceId: string }> = {
  monthly: { cta: 'Subscribe — £4.99/month', short: '£4.99/month', priceId: MONTHLY_PRICE_ID },
  yearly:  { cta: 'Subscribe — £39.99/year', short: '£39.99/year', priceId: YEARLY_PRICE_ID },
};

const benefits = [
  { icon: TrendingUp, title: 'Rank Higher',          sub: 'Seen before free users.' },
  { icon: Zap,        title: 'Instant Alerts',       sub: 'Get requests first.' },
  { icon: Heart,      title: 'Unlimited Favourites', sub: 'Save trusted helpers.' },
  { icon: Shield,     title: 'Premium Badge',        sub: 'Signal verified trust.' },
  { icon: Target,     title: 'Better Matches',       sub: 'Smarter trust filters.' },
  { icon: Headphones, title: 'Priority Support',     sub: 'Faster help, first.' },
];

const compareRows = [
  { label: 'Connections',   free: '5 / month',  plus: 'Unlimited' },
  { label: 'Ranking',       free: 'Basic',      plus: 'Priority'  },
  { label: 'Trust filters', free: 'Limited',    plus: 'Advanced'  },
  { label: 'Support',       free: 'Standard',   plus: 'Fast'      },
  { label: 'Trust badge',   free: '—',          plus: 'Premium'   },
];

const Subscription = () => {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const ctaAnchorRef = useRef<HTMLDivElement | null>(null);
  const [cancelDefenseOpen, setCancelDefenseOpen] = useState(false);
  const { isTrustedPlus, plan } = useSubscription();

  useEffect(() => {
    trackEvent('subscription_view');
  }, []);

  // Sticky CTA appears once the inline CTA scrolls out of view.
  useEffect(() => {
    const node = ctaAnchorRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { rootMargin: '-40px 0px 0px 0px', threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const handleSubscribe = () => {
    if (submitting) return;
    haptic('medium');
    trackEvent('subscription_upgrade_tap', cycle);
    if (isTrustedPlus) {
      // Active members tapping "Manage" → show retention save first
      setCancelDefenseOpen(true);
      return;
    }
    openPaywall({
      trigger: 'manual',
      directPriceId: PRICES[cycle].priceId,
      headline: cycle === 'yearly' ? 'Trusted Plus — Yearly' : 'Trusted Plus — Monthly',
      sub: cycle === 'yearly' ? '£39.99/year · Save 33%' : '£4.99/month · Cancel anytime',
    });
  };

  const openPortal = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.origin + '/subscription' },
      });
      if (error || !data?.url) throw new Error(error?.message || 'Could not open billing portal');
      window.open(data.url as string, '_blank', 'noopener');
    } catch (e) {
      toast.error(friendlyError(e, "subscription"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = () => {
    if (restoring) return;
    trackEvent('subscription_restore');
    setRestoring(true);
    setTimeout(() => {
      setRestoring(false);
      toast(isTrustedPlus ? 'Trusted Plus is already active' : 'No active subscription found', {
        description: isTrustedPlus
          ? `You're on the ${plan} plan.`
          : 'If you previously subscribed on this account, it has been restored.',
      });
    }, 600);
  };

  const price = PRICES[cycle];

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-white via-white to-[#F8FAFC]">
      {/* Top bar */}
      <div className="px-5 pt-3 safe-top flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full active:bg-muted/60 transition"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-[#0F172A]" />
        </button>
      </div>

      {/* Urgency chip — soft, honest */}
      <div className="px-5 mt-2 flex justify-center">
        <span
          className="inline-flex items-center gap-1.5"
          style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            color: '#9A3412',
            fontSize: 11.5,
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: 999,
          }}
        >
          <Sparkles size={11} className="text-[#D97706]" />
          High summer demand now
        </span>
      </div>

      {/* Hero */}
      <div className="px-6 pt-4 text-center flex flex-col items-center">
        <div
          className="overflow-hidden bg-white flex items-center justify-center"
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            border: '1px solid #E8ECF2',
            boxShadow:
              '0 18px 40px -18px rgba(47,128,237,0.35), 0 6px 14px -6px rgba(15,23,42,0.10)',
          }}
        >
          <img
            src={petswapIcon}
            alt="PetSwap"
            className="block"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <h1
          className="text-[#0F172A] mt-5"
          style={{
            fontSize: 28,
            lineHeight: 1.12,
            letterSpacing: '-0.022em',
            maxWidth: 320,
            fontWeight: 700,
          }}
        >
          Save hundreds on pet sitting.
          <br />
          Join Trusted Plus.
        </h1>

        <p
          className="text-[#64748B] mt-2.5"
          style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, maxWidth: 320 }}
        >
          More visibility, faster matches, premium trust tools.
        </p>
      </div>

      {/* Pricing */}
      <div className="px-5 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <PlanCard
            selected={cycle === 'monthly'}
            onSelect={() => { haptic('light'); setCycle('monthly'); }}
            amount="£4.99"
            per="per month"
            ariaLabel="Monthly plan, £4.99 per month"
          />
          <PlanCard
            selected={cycle === 'yearly'}
            onSelect={() => { haptic('light'); setCycle('yearly'); }}
            amount="£39.99"
            per="per year"
            sub="Only £3.33/month"
            badge="BEST VALUE • Save 33%"
            ariaLabel="Yearly plan selected, £39.99 per year, save 33 percent"
          />
        </div>

        {/* CTA */}
        <div ref={ctaAnchorRef} className="mt-5">
          <button
            onClick={handleSubscribe}
            disabled={submitting}
            aria-label={`Subscribe — ${price.cta}`}
            className={cn(
              'w-full font-bold text-white inline-flex items-center justify-center gap-2',
              'active:scale-[0.975] transition-transform duration-100 disabled:opacity-70',
            )}
            style={{
              minHeight: 56,
              borderRadius: 18,
              fontSize: 16.5,
              letterSpacing: '-0.01em',
              background: 'linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)',
              boxShadow:
                '0 12px 26px -10px rgba(29,111,232,0.55), 0 2px 0 rgba(255,255,255,0.18) inset',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Activating…
              </>
            ) : (
              price.cta
            )}
          </button>
        </div>

        <p className="text-center mt-3 text-[#64748B]" style={{ fontSize: 12.5, fontWeight: 500 }}>
          Secure payment • Restore • Cancel anytime
        </p>
        <p className="text-center mt-2 text-[#475569]" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4 }}>
          One weekend booking can pay for this plan.
        </p>
      </div>

      {/* Quick proof — trust signals (replaces testimonial) */}
      <div className="px-5 mt-6">
        <div
          className="grid grid-cols-3 gap-2 bg-white"
          style={{
            borderRadius: 18,
            border: '1px solid #E8ECF2',
            padding: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          }}
        >
          <ProofCell icon={<Lock size={14} className="text-[#2F80ED]" />} label="Secure payment" />
          <ProofCell icon={<PawPrint size={14} className="text-[#10B981]" />} label="Loved locally" />
          <ProofCell icon={<Crown size={14} className="text-[#F59E0B]" />} label="Premium badge" />
        </div>
      </div>

      {/* One-time Profile Boost — alternative to subscription */}
      <div className="px-5 mt-5">
        <button
          onClick={() => {
            haptic('medium');
            trackEvent('boost_paywall_open');
            openPaywall({
              trigger: 'boost_cta',
              directPriceId: PRICE_IDS.boost24h,
              headline: 'Boost your profile for 24h',
              sub: 'Appear at the top of match results — one-time, no subscription.',
            });
          }}
          className="w-full text-left bg-white flex items-center gap-3 active:scale-[0.99] transition-transform"
          style={{
            borderRadius: 18,
            border: '1px solid #E8ECF2',
            padding: 14,
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
            }}
          >
            <Zap size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#0F172A] font-semibold text-[15px]">Profile Boost · 24h</p>
            <p className="text-[#64748B] text-[12.5px] mt-0.5">Top of results, instantly. £2.99 one-off.</p>
          </div>
          <span className="text-[#0F172A] font-bold text-[14px]">£2.99</span>
        </button>
      </div>

      {/* Benefits grid */}
      <LazySection minHeight={320} className="px-5 mt-7">
        <h2
          className="text-[#64748B] mb-3"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em' }}
        >
          WHY MEMBERS UPGRADE
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white"
                style={{
                  borderRadius: 18,
                  padding: 14,
                  border: '1px solid #E8ECF2',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
                }}
              >
                <div
                  className="flex items-center justify-center mb-2"
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(47,128,237,0.10)',
                  }}
                >
                  <Icon size={16} className="text-[#2F80ED]" />
                </div>
                <p className="text-[#0F172A]" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                  {b.title}
                </p>
                <p className="text-[#64748B] mt-0.5" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {b.sub}
                </p>
              </div>
            );
          })}
        </div>
      </LazySection>

      {/* Comparison */}
      <LazySection minHeight={320} className="px-5 mt-7">
        <h2
          className="text-[#64748B] mb-3"
          style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em' }}
        >
          FREE vs TRUSTED PLUS
        </h2>
        <div
          className="bg-white overflow-hidden"
          style={{
            borderRadius: 22,
            border: '1px solid #E8ECF2',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: '1.2fr 1fr 1fr',
              background: '#F8FAFC',
              borderBottom: '1px solid #E8ECF2',
            }}
          >
            <div className="px-3 py-3" />
            <div className="px-3 py-3 text-center text-[#64748B]"
              style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em' }}>
              FREE
            </div>
            <div className="px-3 py-3 text-center text-[#2F80ED]"
              style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em' }}>
              PLUS
            </div>
          </div>
          {compareRows.map((row, i) => (
            <div
              key={row.label}
              className="grid items-center"
              style={{
                gridTemplateColumns: '1.2fr 1fr 1fr',
                borderTop: i === 0 ? 'none' : '1px solid #F1F5F9',
                minHeight: 52,
              }}
            >
              <div className="px-3 py-3.5 text-[#0F172A]" style={{ fontSize: 13.5, fontWeight: 600 }}>
                {row.label}
              </div>
              <div className="px-3 py-3.5 text-center text-[#64748B]" style={{ fontSize: 13 }}>
                {row.free === '—' ? <X size={14} className="inline text-[#CBD5E1]" /> : row.free}
              </div>
              <div className="px-3 py-3.5 text-center text-[#0F172A]" style={{ fontSize: 13, fontWeight: 700 }}>
                {row.plus}
              </div>
            </div>
          ))}
        </div>
      </LazySection>

      {/* Continue with free plan — clearer secondary action */}
      <div className="px-5 mt-7">
        <button
          onClick={() => { haptic('light'); navigate(-1); }}
          className="w-full bg-white active:scale-[0.99] transition-transform"
          style={{
            minHeight: 48,
            borderRadius: 16,
            border: '1px solid #E8ECF2',
            color: '#0F172A',
            fontSize: 14.5,
            fontWeight: 600,
          }}
        >
          Continue with free plan
        </button>
      </div>

      {/* Footer trust */}
      <div className="px-6 mt-5 text-center">
        <div className="inline-flex items-center gap-1.5 text-[12px] text-[#64748B]">
          <Lock size={12} />
          <span>Secure payment via App Store / Google Play</span>
        </div>
        <p className="text-[#94A3B8] mt-2" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
          Auto-renews until cancelled. Manage or cancel anytime in Settings.
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[12.5px]">
          <button onClick={() => navigate('/legal/terms')} className="text-[#2F80ED] font-semibold">
            Terms
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button onClick={() => navigate('/legal/privacy')} className="text-[#2F80ED] font-semibold">
            Privacy
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="text-[#2F80ED] font-semibold inline-flex items-center gap-1 disabled:opacity-60"
          >
            {restoring && <Loader2 size={11} className="animate-spin" />}
            Restore
          </button>
        </div>
        <button
          onClick={() => navigate('/help')}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2F80ED] active:opacity-70"
        >
          <span className="relative inline-flex">
            <span className="block w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-50 animate-ping" />
          </span>
          Need help? Chat with support
        </button>
      </div>

      {/* Sticky CTA — appears after scrolling past the inline CTA */}
      <div
        className={cn(
          'fixed left-0 right-0 z-40 px-4 pb-3 transition-all duration-250 ease-out',
          'bottom-0 safe-bottom pointer-events-none',
        )}
        aria-hidden={!showStickyCta}
        style={{
          transform: showStickyCta ? 'translateY(0)' : 'translateY(110%)',
          opacity: showStickyCta ? 1 : 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 35%, #FFFFFF 100%)',
          paddingTop: 16,
        }}
      >
        <button
          onClick={handleSubscribe}
          disabled={submitting}
          className="mx-auto max-w-md w-full inline-flex items-center justify-center gap-2 font-bold text-white pointer-events-auto active:scale-[0.985] transition-transform"
          style={{
            minHeight: 52,
            borderRadius: 16,
            fontSize: 15.5,
            background: 'linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)',
            boxShadow:
              '0 14px 30px -12px rgba(29,111,232,0.55), 0 2px 0 rgba(255,255,255,0.18) inset',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Activating…
            </>
          ) : (
            <>Start Trusted Plus — {price.short}</>
          )}
        </button>
      </div>

      <CancelDefenseSheet
        isOpen={cancelDefenseOpen}
        onClose={() => setCancelDefenseOpen(false)}
        onConfirmCancel={() => {
          setCancelDefenseOpen(false);
          void openPortal();
        }}
      />
    </div>
  );
};

const ProofCell = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-2">
    <div
      className="flex items-center justify-center"
      style={{ width: 30, height: 30, borderRadius: 10, background: '#F1F5F9' }}
    >
      {icon}
    </div>
    <p className="text-[#0F172A] text-center" style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2 }}>
      {label}
    </p>
  </div>
);

interface PlanCardProps {
  selected: boolean;
  onSelect: () => void;
  amount: string;
  per: string;
  sub?: string;
  badge?: string;
  ariaLabel?: string;
}

const PlanCard = ({ selected, onSelect, amount, per, sub, badge, ariaLabel }: PlanCardProps) => (
  <button
    onClick={onSelect}
    aria-label={ariaLabel}
    aria-pressed={selected}
    className={cn(
      'relative text-left transition-all duration-200 bg-white',
      'flex flex-col justify-between',
    )}
    style={{
      height: 132,
      borderRadius: 22,
      padding: 14,
      border: selected ? '2px solid #2F80ED' : '1px solid #E8ECF2',
      boxShadow: selected
        ? '0 14px 32px -16px rgba(47,128,237,0.45), 0 2px 6px -2px rgba(47,128,237,0.15)'
        : '0 1px 2px rgba(15,23,42,0.04)',
    }}
  >
    {badge && (
      <span
        className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-white"
        style={{
          background: 'linear-gradient(180deg,#2F80ED,#1D6FE8)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          padding: '4px 9px',
          borderRadius: 999,
          boxShadow: '0 4px 10px -3px rgba(47,128,237,0.45)',
        }}
      >
        {badge}
      </span>
    )}

    <div className="flex items-start justify-between">
      <div>
        <p
          className="text-[#0F172A]"
          style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}
        >
          {amount}
        </p>
        <p className="text-[12.5px] text-[#64748B] mt-1.5">{per}</p>
      </div>
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 20, height: 20, borderRadius: 999,
          border: selected ? '2px solid #2F80ED' : '2px solid #D1D5DB',
          background: selected ? '#2F80ED' : 'transparent',
          marginTop: 2,
        }}
      >
        {selected && <Check size={11} strokeWidth={3} className="text-white" />}
      </div>
    </div>

    {sub ? (
      <p className="text-[#2F80ED]" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {sub}
      </p>
    ) : (
      <span />
    )}
  </button>
);

export default Subscription;
