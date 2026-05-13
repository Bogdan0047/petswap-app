import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  PawPrint,
  ArrowRight,
  Sparkles,
  MessageSquareHeart,
  MapPin,
  BadgeCheck,
  HeartHandshake,
  Mail,
  Flag,
  Star,
  Lock,
  FileText,
  Check,
  UserPlus,
  Search,
  Handshake,
} from "lucide-react";
import PublicLayout from "./PublicLayout";
import petswapIcon from "@/assets/petswap-icon.png";
import { supabase } from "@/integrations/supabase/client";

const trustBadges = [
  {
    icon: BadgeCheck,
    title: "Verified Members",
    body: "Email verification and a trust score on every account.",
  },
  {
    icon: MessageSquareHeart,
    title: "Safe Messaging",
    body: "In-app chat with built-in reporting and block tools.",
  },
  {
    icon: MapPin,
    title: "Local First",
    body: "Only nearby UK members are shown — never random profiles.",
  },
  {
    icon: HeartHandshake,
    title: "No Paid Sitters",
    body: "A community favour system. Help now, get help later.",
  },
];

const howItWorks = [
  {
    icon: UserPlus,
    title: "Create your profile",
    body: "Add yourself, your pets and your area. Free, always.",
  },
  {
    icon: Search,
    title: "Match with locals",
    body: "Find nearby owners who can help when you need it.",
  },
  {
    icon: Handshake,
    title: "Swap with confidence",
    body: "Chat, agree dates, then review each other after.",
  },
];

const safetyItems = [
  { icon: Mail, title: "Verified email required" },
  { icon: Flag, title: "Block & report tools" },
  { icon: Star, title: "Reviews after every swap" },
  { icon: MessageSquareHeart, title: "Support team response" },
  { icon: Lock, title: "Privacy-first location radius" },
  { icon: FileText, title: "Clear terms & community rules" },
];

const freePlan = ["Browse the community", "Create your profile", "In-app chat", "Local matches"];
const plusPlan = [
  "Priority visibility",
  "Premium badge",
  "Faster support",
  "Unlimited favourites",
  "Advanced filters",
];

interface CommunityStats {
  members: number;
  verifiedMembers: number;
  activeThisWeek: number;
  pets: number;
  completedSwaps: number;
  reviewsThisWeek: number;
  topCities: { city: string; count: number }[];
}

// Smooth count-up that triggers once when in view.
const CountUp = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const duration = 900;
            const start = performance.now();
            const from = 0;
            const to = value;
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              setDisplay(Math.round(from + (to - from) * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{display.toLocaleString("en-GB")}</span>;
};

const PublicHome = () => {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("community-stats");
        if (error) throw error;
        if (!cancelled && data) setStats(data as CommunityStats);
      } catch (e) {
        console.warn("community-stats unavailable", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasStats = stats !== null && stats.members > 0;
  const isFounding = (stats?.members ?? 0) > 0 && (stats?.members ?? 0) < 100;

  return (
    <PublicLayout
      title="PetSwap UK | Trusted Pet Sitting Alternative"
      description="Swap pet care with verified UK pet owners. Save money, meet trusted locals, join free."
    >
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Soft blue radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 0%, rgba(47,128,237,0.14), rgba(255,255,255,0) 60%), linear-gradient(180deg, #ffffff 0%, #ffffff 100%)",
          }}
        />
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="relative inline-block animate-in fade-in zoom-in-95 duration-700">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 blur-2xl opacity-70"
              style={{ background: "radial-gradient(circle, rgba(47,128,237,0.45), transparent 70%)" }}
            />
            <img
              src={petswapIcon}
              alt="PetSwap"
              width={88}
              height={88}
              className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-[22px] mx-auto"
              style={{ boxShadow: "0 22px 50px -16px rgba(47,128,237,0.45)" }}
              fetchPriority="high"
            />
          </div>

          <div className="mt-7 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[12.5px] font-medium animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles size={12} className="text-[hsl(213_82%_56%)]" />
            UK Trusted Pet Community
          </div>

          <h1 className="mt-5 text-[40px] sm:text-[60px] leading-[1.02] font-semibold tracking-tight text-slate-900 animate-in fade-in slide-in-from-bottom-3 duration-700">
            A neighbourhood of <br className="hidden sm:block" />
            pet owners. Real ones.
          </h1>
          <p className="mt-5 text-[17px] sm:text-[19px] leading-relaxed text-slate-600 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700 delay-75">
            Swap pet care with verified local owners. No expensive sitters. No fake profiles. Just trust.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/welcome"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 text-white text-[15.5px] font-medium hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:scale-[0.98] w-full sm:w-auto shadow-[0_14px_34px_-12px_rgba(15,23,42,0.55)]"
            >
              Join Free
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white border border-slate-200 text-slate-900 text-[15.5px] font-medium hover:bg-slate-50 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            >
              How It Works
            </a>
          </div>

          <p className="mt-7 text-[13px] text-slate-500">
            Free forever · Verified members · UK only
          </p>
        </div>
      </section>

      {/* ===== LIVE STATS ===== */}
      {hasStats && stats && (
        <section className="max-w-5xl mx-auto px-5 sm:px-8 -mt-2 sm:mt-2 pb-4">
          <div className="text-center mb-6">
            <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500">
              {isFounding ? "Founding community" : "Live community"}
            </p>
            <h2 className="mt-2 text-[24px] sm:text-[30px] font-semibold tracking-tight text-slate-900">
              Real numbers. Real owners.
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Members" value={stats.members} />
            <StatCard label="Verified" value={stats.verifiedMembers} />
            <StatCard label="Pets on PetSwap" value={stats.pets} />
            <StatCard label="Active this week" value={stats.activeThisWeek} />
          </div>
          <p className="mt-5 text-center text-[12.5px] text-slate-500">
            Live numbers from our database — never inflated.
          </p>
        </section>
      )}

      {/* ===== TRUST BADGES ===== */}
      <section id="trust" className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
            Why people trust PetSwap
          </p>
          <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-slate-900">
            Built for trust from day one.
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trustBadges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 hover:border-slate-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.18)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(213_82%_56%)]/10 flex items-center justify-center mb-3.5">
                  <Icon size={18} className="text-[hsl(213_82%_46%)]" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight">{b.title}</h3>
                <p className="mt-1 text-[13.5px] text-slate-600 leading-[1.6]">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="border-y border-slate-100 bg-slate-50/60 mt-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
              How it works
            </p>
            <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-slate-900">
              A pet sitting alternative built around trust.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            {howItWorks.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="bg-white border border-slate-100 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.18)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900/[0.04] flex items-center justify-center mb-4">
                    <Icon size={18} className="text-slate-700" />
                  </div>
                  <p className="text-[12px] font-semibold text-slate-400 mb-1">STEP {i + 1}</p>
                  <h3 className="text-[16.5px] font-semibold text-slate-900 tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-[14.5px] text-slate-600 leading-[1.65]">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CITIES ===== */}
      {hasStats && stats && stats.topCities.length > 0 && (
        <section id="cities" className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
              Where we're growing
            </p>
            <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-slate-900">
              Pet owners are joining across the UK.
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              Real cities, real members. Be one of the first in yours.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.topCities.map((c, i) => (
              <div
                key={c.city}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_12px_30px_-14px_rgba(15,23,42,0.15)] transition-all animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-9 h-9 rounded-xl bg-[hsl(213_82%_56%)]/10 flex items-center justify-center">
                  <MapPin size={15} className="text-[hsl(213_82%_46%)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 truncate">{c.city}</p>
                  <p className="text-[12px] text-slate-500 tabular-nums">
                    {c.count} {c.count === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/welcome"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-[hsl(213_82%_46%)] hover:text-[hsl(213_82%_36%)]"
            >
              Be first in your city
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ===== SAFETY ===== */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
              Safety
            </p>
            <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-slate-900">
              Built around safety.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {safetyItems.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-emerald-600" />
                  </div>
                  <p className="text-[14px] font-medium text-slate-800">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
            Pricing
          </p>
          <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-tight text-slate-900">
            Free forever. Premium if you want more.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PriceCard
            name="Free"
            price="£0"
            sub="Always free for owners"
            features={freePlan}
            cta="Join Free"
            ctaHref="/welcome"
            highlighted={false}
          />
          <PriceCard
            name="Trusted Plus"
            price="£4.99"
            sub="per month · or £39.99/year"
            features={plusPlan}
            cta="Upgrade to Trusted Plus"
            ctaHref="/welcome"
            highlighted
          />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 100%, rgba(47,128,237,0.12), rgba(255,255,255,0) 70%)",
          }}
        />
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
          <h2 className="text-[30px] sm:text-[44px] font-semibold tracking-tight text-slate-900">
            Help build the UK's most trusted pet community.
          </h2>
          <p className="mt-4 text-[16px] text-slate-600">Free to join. Real owners only.</p>
          <Link
            to="/welcome"
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 text-white text-[15.5px] font-medium hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-[0.98] shadow-[0_14px_34px_-12px_rgba(15,23,42,0.55)]"
          >
            Join Free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 text-center sm:text-left hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(15,23,42,0.18)] transition-all">
    <p className="text-[34px] sm:text-[40px] font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
      <CountUp value={value} />
    </p>
    <p className="mt-2 text-[12.5px] font-medium text-slate-500">{label}</p>
  </div>
);

const PriceCard = ({
  name,
  price,
  sub,
  features,
  cta,
  ctaHref,
  highlighted,
}: {
  name: string;
  price: string;
  sub: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}) => (
  <div
    className={`relative rounded-3xl p-7 sm:p-8 transition-all hover:-translate-y-1 ${
      highlighted
        ? "bg-slate-900 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.55)]"
        : "bg-white border border-slate-100 text-slate-900 hover:border-slate-200 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.18)]"
    }`}
  >
    {highlighted && (
      <span className="absolute top-5 right-5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold tracking-wide uppercase">
        <Sparkles size={11} /> Plus
      </span>
    )}
    <p className={`text-[13px] font-semibold ${highlighted ? "text-white/70" : "text-slate-500"}`}>
      {name}
    </p>
    <div className="mt-3 flex items-baseline gap-1.5">
      <span className="text-[40px] font-semibold tracking-tight">{price}</span>
      {name !== "Free" && (
        <span className={`text-[13px] ${highlighted ? "text-white/70" : "text-slate-500"}`}>/mo</span>
      )}
    </div>
    <p className={`mt-1 text-[13px] ${highlighted ? "text-white/70" : "text-slate-500"}`}>{sub}</p>
    <ul className="mt-6 space-y-2.5">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-[14px]">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
              highlighted ? "bg-white/15" : "bg-emerald-50"
            }`}
          >
            <Check size={12} className={highlighted ? "text-white" : "text-emerald-600"} />
          </span>
          <span className={highlighted ? "text-white/90" : "text-slate-700"}>{f}</span>
        </li>
      ))}
    </ul>
    <Link
      to={ctaHref}
      className={`mt-7 inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full text-[14.5px] font-medium transition-all active:scale-[0.98] ${
        highlighted
          ? "bg-white text-slate-900 hover:bg-slate-100"
          : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
    >
      {cta}
      <ArrowRight size={15} />
    </Link>
  </div>
);

export default PublicHome;
