import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustTier = "low" | "improving" | "good" | "trusted";

interface TrustScoreLevelProps {
  /** 0-100 trust score */
  score: number;
  /** Optional explicit tier override */
  tier?: TrustTier;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

const tierFromScore = (score: number): TrustTier => {
  if (score >= 80) return "trusted";
  if (score >= 60) return "good";
  if (score >= 40) return "improving";
  return "low";
};

const tierMeta: Record<
  TrustTier,
  { label: string; icon: typeof Shield; tone: string; ring: string }
> = {
  trusted: {
    label: "Trusted",
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-50",
    ring: "ring-emerald-100",
  },
  good: {
    label: "Good standing",
    icon: Shield,
    tone: "text-sky-600 bg-sky-50",
    ring: "ring-sky-100",
  },
  improving: {
    label: "Improving",
    icon: ShieldAlert,
    tone: "text-amber-600 bg-amber-50",
    ring: "ring-amber-100",
  },
  low: {
    label: "New here",
    icon: ShieldQuestion,
    tone: "text-slate-600 bg-slate-100",
    ring: "ring-slate-200",
  },
};

const sizing = {
  sm: { pad: "px-2 py-0.5", text: "text-[11px]", icon: 11, gap: "gap-1" },
  md: { pad: "px-2.5 py-1", text: "text-[12px]", icon: 13, gap: "gap-1.5" },
  lg: { pad: "px-3 py-1.5", text: "text-[13px]", icon: 14, gap: "gap-1.5" },
};

/**
 * Premium trust pill that shows the user's current trust level with an
 * optional numeric score. Built to feel honest — small accounts read as
 * "New here", not as fake high-trust badges.
 */
const TrustScoreLevel = ({
  score,
  tier,
  size = "md",
  showScore = true,
  className,
}: TrustScoreLevelProps) => {
  const t = tier ?? tierFromScore(score);
  const meta = tierMeta[t];
  const s = sizing[size];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full ring-1",
        meta.tone,
        meta.ring,
        s.pad,
        s.text,
        s.gap,
        className,
      )}
      title={`Trust level: ${meta.label}${showScore ? ` (${score}/100)` : ""}`}
    >
      <Icon size={s.icon} />
      <span>{meta.label}</span>
      {showScore && (
        <span className="opacity-70 tabular-nums font-medium">· {score}</span>
      )}
    </span>
  );
};

export { TrustScoreLevel, tierFromScore };
export default TrustScoreLevel;
