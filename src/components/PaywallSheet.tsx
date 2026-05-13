import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StripeEmbeddedCheckout from "@/components/StripeEmbeddedCheckout";
import { useAuth } from "@/lib/auth";
import {
  Crown, Check, X, Star, ShieldCheck, Zap, Infinity as InfinityIcon,
  BadgeCheck, Sparkles, HeartHandshake, ChevronDown,
} from "lucide-react";
import { PRICE_IDS } from "@/lib/stripe";
import { recordPaywallEvent, FREE_DAILY_MATCH_LIMIT } from "@/lib/monetization";
import { getPaywallVariant, type PaywallVariant } from "@/lib/paywallStore";
import { trackEvent } from "@/lib/analyticsStore";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";
import { supabase } from "@/integrations/supabase/client";

export type PaywallTrigger =
  | "match_limit"
  | "post_booking"
  | "chat_momentum"
  | "boost_cta"
  | "filters"
  | "priority"
  | "manual";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: PaywallTrigger;
  /** If set, opens straight into checkout for this price (e.g. boost). */
  directPriceId?: string;
  /** Override headline copy for context-specific paywalls. */
  headline?: string;
  sub?: string;
}

type Plan = "monthly" | "yearly";

const VARIANT_COPY: Record<PaywallVariant, { headline: string; sub: string }> = {
  A: {
    headline: "Save hundreds on pet sitting.",
    sub: "Trusted pet care — without paying sitters every time.",
  },
  B: {
    headline: "Never pay for pet sitting again.",
    sub: "Swap care with trusted owners near you.",
  },
  C: {
    headline: "Join PetSwap Premium.",
    sub: "Unlimited swaps with verified members.",
  },
};

function copyForTrigger(
  trigger: PaywallTrigger,
  variant: PaywallVariant,
  meta: { matchesUsed?: number; matchLimit?: number },
): { headline: string; sub: string } {
  switch (trigger) {
    case "match_limit":
      return {
        headline: "You've reached your free matches",
        sub: `${meta.matchesUsed ?? meta.matchLimit ?? FREE_DAILY_MATCH_LIMIT}/${meta.matchLimit ?? FREE_DAILY_MATCH_LIMIT} used today — unlock unlimited swaps.`,
      };
    case "chat_momentum":
      return {
        headline: "Don't lose this match",
        sub: "Unlock unlimited messaging and book your swap.",
      };
    case "post_booking":
      return {
        headline: "You just saved £50 🎉",
        sub: "Unlock unlimited swaps for less than a coffee a week.",
      };
    case "filters":
      return {
        headline: "Unlock advanced filters",
        sub: "Filter by distance, pet type and availability.",
      };
    case "priority":
      return {
        headline: "Get seen first",
        sub: "Premium members appear higher and match faster.",
      };
    case "manual":
    default:
      return VARIANT_COPY[variant];
  }
}

const BENEFITS: { icon: React.ReactNode; title: string; sub: string }[] = [
  { icon: <InfinityIcon size={16} />, title: "Unlimited pet swaps", sub: "Match and message without limits" },
  { icon: <BadgeCheck size={16} />, title: "Verified trusted members", sub: "ID-checked community you can trust" },
  { icon: <Zap size={16} />, title: "Priority matching", sub: "Get matches faster, appear higher" },
  { icon: <HeartHandshake size={16} />, title: "Premium support", sub: "Real humans, fast replies" },
  { icon: <ShieldCheck size={16} />, title: "Safer, smarter pet care", sub: "Built-in safety tools" },
];

const URGENCY_MESSAGES = [
  "High demand in your area — more pets being matched daily",
  "12 new pets added near you this week",
  "Premium members are matching faster",
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes, instantly from your account. No questions asked." },
  { q: "Are there hidden fees?", a: "No. What you see is what you pay. Ever." },
  { q: "How does PetSwap work?", a: "You help others with their pets, they help you. Simple, friendly, free." },
];

export default function PaywallSheet({
  open,
  onOpenChange,
  trigger,
  directPriceId,
  headline,
  sub,
}: Props) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly"); // ⚠️ yearly default
  const [showCheckout, setShowCheckout] = useState<string | null>(null);
  const [matchesUsed, setMatchesUsed] = useState<number | undefined>(undefined);
  const [urgencyIdx, setUrgencyIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [exitIntent, setExitIntent] = useState(false);
  const [exitShown, setExitShown] = useState(false);

  const variant = useMemo<PaywallVariant>(() => getPaywallVariant(), []);
  const ctxCopy = copyForTrigger(trigger, variant, {
    matchesUsed,
    matchLimit: FREE_DAILY_MATCH_LIMIT,
  });
  const finalHeadline = headline ?? ctxCopy.headline;
  const finalSub = sub ?? ctxCopy.sub;

  // Rotate urgency message every 4s
  useEffect(() => {
    if (!open || showCheckout) return;
    const id = window.setInterval(() => {
      setUrgencyIdx((i) => (i + 1) % URGENCY_MESSAGES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [open, showCheckout]);

  // Match-limit usage line
  useEffect(() => {
    if (!open || trigger !== "match_limit") return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) return;
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase
          .from("profiles")
          .select("daily_matches_count,daily_matches_reset_at")
          .eq("id", u.id)
          .maybeSingle();
        if (cancelled) return;
        const used = (data?.daily_matches_reset_at as string | undefined) === today
          ? Number(data?.daily_matches_count ?? 0)
          : 0;
        setMatchesUsed(used);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [open, trigger]);

  useEffect(() => {
    if (open) {
      trackEvent("paywall_view", `${trigger}:${variant}`);
      void recordPaywallEvent({ trigger, action: "view", metadata: { variant } });
      if (directPriceId) setShowCheckout(directPriceId);
    } else {
      setShowCheckout(null);
      setPlan("yearly");
      setOpenFaq(null);
      setExitShown(false);
      setExitIntent(false);
    }
  }, [open, trigger, directPriceId, variant]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !showCheckout && !exitShown) {
      setExitShown(true);
      setExitIntent(true);
      trackEvent("paywall_exit_intent", `${trigger}:${variant}`);
      return;
    }
    onOpenChange(next);
  };

  const startCheckout = (priceId: string, p: Plan) => {
    haptic("medium");
    trackEvent("paywall_click", `${trigger}:${variant}:${p}`);
    trackEvent("purchase_started", priceId);
    void recordPaywallEvent({ trigger, action: "cta_click", priceId, metadata: { variant, plan: p } });
    void recordPaywallEvent({ trigger, action: "purchase_started", priceId, metadata: { variant, plan: p } });
    setShowCheckout(priceId);
  };

  const selectedPriceId = plan === "yearly" ? PRICE_IDS.yearly : PRICE_IDS.monthly;

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[28px] p-0 max-h-[96vh] overflow-hidden bg-white flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>PetSwap Premium</SheetTitle>
        </SheetHeader>

        {showCheckout ? (
          <div className="px-4 pt-3 pb-6 overflow-y-auto">
            <button
              onClick={() => setShowCheckout(null)}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
            >
              <X size={16} /> Back
            </button>
            <StripeEmbeddedCheckout
              priceId={showCheckout}
              userId={user?.id}
              customerEmail={user?.email ?? undefined}
              trigger={trigger}
            />
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 pt-6 pb-[140px]">
              {/* HERO */}
              <div className="flex justify-center mb-3">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "linear-gradient(135deg, #2F80ED 0%, #1D6FE8 100%)",
                    boxShadow: "0 12px 24px -10px rgba(29,111,232,0.55)",
                  }}
                >
                  <Crown size={26} className="text-white" />
                </div>
              </div>

              <h2
                className="text-center text-[#0F172A] px-1"
                style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {finalHeadline}
              </h2>
              <p className="text-center text-[#64748B] mt-2 text-[14.5px] leading-snug px-2">
                {finalSub}
              </p>

              {/* Trust line */}
              <div className="mt-3 flex items-center justify-center gap-3 flex-wrap text-[12px] text-[#475569]">
                <TrustTick label="Cancel anytime" />
                <TrustTick label="No hidden fees" />
                <TrustTick label="Trusted community" />
              </div>

              {/* EMOTIONAL TRUST TRIGGER */}
              <p
                className="mt-4 text-center text-[13.5px] italic text-[#0F172A] px-3"
                style={{ fontWeight: 500 }}
              >
                "Your pet deserves trusted care."
              </p>

              {/* IMMEDIATE VALUE */}
              <p className="mt-2 text-center text-[13px] text-[#64748B] px-3">
                Start matching with trusted pet owners in seconds.
              </p>

              {/* URGENCY STRIP */}
              <div
                className="mt-4 mx-auto flex items-center gap-2 justify-center"
                style={{
                  background: "#FFF7ED",
                  border: "1px solid #FED7AA",
                  borderRadius: 12,
                  padding: "8px 12px",
                }}
              >
                <Sparkles size={13} className="text-[#EA580C] flex-shrink-0" />
                <p key={urgencyIdx} className="text-[12.5px] text-[#9A3412] font-medium animate-in fade-in duration-500 text-center">
                  {URGENCY_MESSAGES[urgencyIdx]}
                </p>
              </div>

              {/* VALUE STACK */}
              <div className="mt-5">
                <ul className="space-y-2.5">
                  {BENEFITS.map((b) => (
                    <li key={b.title} className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 flex items-center justify-center text-[#2F80ED]"
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "rgba(47,128,237,0.10)",
                        }}
                      >
                        {b.icon}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <p className="text-[14px] font-semibold text-[#0F172A] leading-tight">{b.title}</p>
                        <p className="text-[12.5px] text-[#64748B] leading-snug">{b.sub}</p>
                      </div>
                      <Check size={16} className="text-[#10B981] mt-2 flex-shrink-0" strokeWidth={3} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-center text-[12.5px] text-[#0F172A] font-semibold">
                  Most members save £200–£1,000 per year
                </p>
              </div>


              {/* PRICE COMPARISON */}
              <div
                className="mt-5 px-4 py-3"
                style={{
                  background: "#F6F8FB",
                  border: "1px solid #EEF1F5",
                  borderRadius: 14,
                }}
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#64748B]">One pet sitting</span>
                  <span className="text-[#0F172A] font-semibold">£30–£60</span>
                </div>
                <div className="h-px bg-[#EEF1F5] my-2" />
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#64748B]">PetSwap Premium</span>
                  <span className="text-[#10B981] font-bold">£3.33/month</span>
                </div>
              </div>

              {/* PRICING */}
              <div className="mt-5 space-y-2.5">
                <PriceCard
                  selected={plan === "yearly"}
                  onClick={() => { haptic("light"); setPlan("yearly"); }}
                  badge="MOST POPULAR · SAVE 33%"
                  title="Yearly"
                  amount="£39.99"
                  per="/year"
                  sub="£3.33/month — less than one coffee a week ☕"
                />
                <PriceCard
                  selected={plan === "monthly"}
                  onClick={() => { haptic("light"); setPlan("monthly"); }}
                  title="Monthly"
                  amount="£4.99"
                  per="/month"
                  sub="Flexible — cancel anytime"
                />
                <p className="text-center text-[12px] text-[#64748B] pt-1">
                  No commitment · Cancel anytime in 1 tap
                </p>
              </div>

              {/* OUTCOME PROMISE */}
              <p className="mt-4 text-center text-[13px] text-[#0F172A] font-semibold">
                Most users find their first match within days
              </p>

              {/* SOCIAL PROOF */}
              <div className="mt-6">
                <p className="text-center text-[12px] uppercase tracking-wider text-[#94A3B8] font-semibold">
                  Trusted by pet owners across the UK
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-4 text-[13px] text-[#0F172A]">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-[#F5A623]" fill="#F5A623" />
                    <span className="font-bold">4.8</span>
                    <span className="text-[#64748B]">avg rating</span>
                  </span>
                  <span className="text-[#CBD5E1]">·</span>
                  <span className="inline-flex items-center gap-1 text-[#64748B]">
                    <span className="font-bold text-[#0F172A]">1,000s</span> successful swaps
                  </span>
                </div>
              </div>

              {/* RISK REVERSAL */}
              <div
                className="mt-5 px-4 py-3.5"
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: 14,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck size={15} className="text-[#10B981]" />
                  <p className="text-[13.5px] font-bold text-[#065F46]">Try Premium risk-free</p>
                </div>
                <ul className="text-[12.5px] text-[#047857] space-y-0.5 pl-1">
                  <li>· Cancel anytime in one tap</li>
                  <li>· No contracts, no hidden charges</li>
                  <li>· Secure payment via Stripe</li>
                </ul>
              </div>

              {/* FAQ */}
              <div className="mt-5">
                <p className="text-[13px] font-bold text-[#0F172A] mb-2">Questions?</p>
                <div className="rounded-2xl border border-[#E8ECF2] overflow-hidden">
                  {FAQS.map((f, i) => (
                    <div key={f.q} className={i > 0 ? "border-t border-[#E8ECF2]" : ""}>
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[13.5px] font-medium text-[#0F172A]">{f.q}</span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            "text-[#94A3B8] transition-transform",
                            openFaq === i && "rotate-180",
                          )}
                        />
                      </button>
                      {openFaq === i && (
                        <p className="px-4 pb-3 text-[13px] text-[#64748B] leading-relaxed">{f.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STICKY CTA */}
            <div
              className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-5 bg-white"
              style={{
                borderTop: "1px solid #EEF1F5",
                boxShadow: "0 -8px 24px -12px rgba(15,23,42,0.08)",
              }}
            >
              <button
                onClick={() => startCheckout(selectedPriceId, plan)}
                className="w-full font-bold text-white inline-flex items-center justify-center transition-transform active:scale-[0.98]"
                style={{
                  minHeight: 54,
                  borderRadius: 16,
                  fontSize: 16,
                  background: "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
                  boxShadow: "0 12px 26px -10px rgba(29,111,232,0.55)",
                }}
              >
                Start saving now
              </button>
              <p className="text-center text-[#64748B] mt-1.5 text-[12px]">
                Instant access · Cancel anytime
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* EXIT INTENT MODAL */}
    {exitIntent && (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 animate-in fade-in duration-200"
        onClick={() => { setExitIntent(false); onOpenChange(false); }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-sm bg-white rounded-t-[24px] sm:rounded-[24px] p-6 animate-in slide-in-from-bottom-4 duration-300"
          style={{ boxShadow: "0 -20px 60px -20px rgba(15,23,42,0.3)" }}
        >
          <div className="flex justify-center mb-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 52, height: 52, borderRadius: 16,
                background: "rgba(16,185,129,0.12)",
              }}
            >
              <ShieldCheck size={26} className="text-[#10B981]" />
            </div>
          </div>
          <h3 className="text-center text-[#0F172A] font-bold" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
            Wait — try risk-free
          </h3>
          <p className="text-center text-[#64748B] mt-1.5 text-[14px]">
            Your pet deserves trusted care. Cancel anytime in 1 tap — no questions asked.
          </p>
          <button
            onClick={() => {
              haptic("medium");
              trackEvent("paywall_exit_continue", `${trigger}:${variant}`);
              setExitIntent(false);
            }}
            className="mt-5 w-full font-bold text-white inline-flex items-center justify-center transition-transform active:scale-[0.98]"
            style={{
              minHeight: 52,
              borderRadius: 14,
              fontSize: 15.5,
              background: "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
              boxShadow: "0 12px 26px -10px rgba(29,111,232,0.55)",
            }}
          >
            Continue
          </button>
          <button
            onClick={() => { setExitIntent(false); onOpenChange(false); }}
            className="mt-2 w-full text-[#94A3B8] text-[13px] py-2"
          >
            No thanks
          </button>
        </div>
      </div>
    )}
    </>
  );
}

function TrustTick({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Check size={12} className="text-[#10B981]" strokeWidth={3} />
      <span>{label}</span>
    </span>
  );
}

function PriceCard({
  selected,
  onClick,
  badge,
  title,
  amount,
  per,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  badge?: string;
  title: string;
  amount: string;
  per: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="relative w-full text-left bg-white transition-all active:scale-[0.99]"
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        border: selected ? "2px solid #2F80ED" : "1.5px solid #E8ECF2",
        boxShadow: selected
          ? "0 12px 28px -14px rgba(47,128,237,0.45)"
          : "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {badge && (
        <span
          className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold text-white"
          style={{
            background: "linear-gradient(180deg, #10B981 0%, #059669 100%)",
            borderRadius: 999,
            letterSpacing: "0.04em",
          }}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[#0F172A] font-bold" style={{ fontSize: 22 }}>{amount}</span>
            <span className="text-[#64748B] text-[13px]">{per}</span>
          </div>
          {sub && <p className="text-[12px] text-[#10B981] font-medium mt-0.5">{sub}</p>}
        </div>
        <span
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 22, height: 22, borderRadius: 999,
            border: selected ? "2px solid #2F80ED" : "2px solid #CBD5E1",
            background: selected ? "#2F80ED" : "white",
          }}
        >
          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}
