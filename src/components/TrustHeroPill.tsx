import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrustTier } from '@/lib/trust';

interface Props {
  score: number;
  tier: TrustTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Big, instantly-readable trust pill used on profile heroes and chat strips.
 * Maps tiers to a clear human label users grasp in <1s:
 *   trusted/good (≥60) → "Highly Trusted" (green)
 *   improving (40–59)  → "Moderate Trust" (yellow)
 *   low (<40)          → "Low Trust"      (red)
 */
const TrustHeroPill = ({ score, tier, size = 'md', className }: Props) => {
  const isHigh = tier === 'trusted' || tier === 'good';
  const isMid = tier === 'improving';

  const label = isHigh ? 'Highly Trusted' : isMid ? 'Moderate Trust' : 'Low Trust';
  const Icon = isHigh ? ShieldCheck : isMid ? Shield : ShieldAlert;

  const palette = isHigh
    ? 'bg-success/12 text-success ring-success/25'
    : isMid
    ? 'bg-warning/15 text-warning ring-warning/30'
    : 'bg-destructive/12 text-destructive ring-destructive/30';

  const dims =
    size === 'lg'
      ? 'px-3 py-1.5 text-[13px] gap-1.5'
      : size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-[12px] gap-1.5';

  const iconSize = size === 'lg' ? 14 : size === 'sm' ? 11 : 12;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full ring-1 font-semibold animate-fade-in',
        palette,
        dims,
        className,
      )}
      title={`${label} · trust score ${score}/100`}
    >
      <Icon size={iconSize} />
      {label}
      <span className="opacity-70 font-medium tabular-nums">· {score}</span>
    </span>
  );
};

export default TrustHeroPill;
