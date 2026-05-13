import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { TrustBreakdown, TrustTier } from '@/lib/trust';
import { cn } from '@/lib/utils';

interface Props {
  breakdown: TrustBreakdown;
  onAction?: () => void;
  className?: string;
}

const tierLadder: { tier: TrustTier; threshold: number; label: string }[] = [
  { tier: 'low', threshold: 0, label: 'New member' },
  { tier: 'improving', threshold: 40, label: 'Improving' },
  { tier: 'good', threshold: 60, label: 'Good standing' },
  { tier: 'trusted', threshold: 80, label: 'Trusted member' },
];

/**
 * Slim, Apple-clean trust progress card. Replaces the giant above-fold
 * version — score + tier + thin progress bar + single action.
 */
const CompactTrustCard = ({ breakdown, onAction, className }: Props) => {
  const { score, tier, tierLabel } = breakdown;
  const idx = tierLadder.findIndex(t => t.tier === tier);
  const next = tierLadder[idx + 1];
  const atTop = !next;
  const prev = tierLadder[idx]?.threshold ?? 0;
  const target = next?.threshold ?? 100;

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const pct = atTop ? 100 : Math.max(4, Math.min(100, ((animated - prev) / (target - prev)) * 100));

  return (
    <div className={cn('card-elevated p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Trust score
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-bold text-[22px] tabular-nums leading-none">{score}</span>
            <span className="text-[13px] font-semibold text-foreground/80">{tierLabel}</span>
          </div>
        </div>
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold tap-feedback"
        >
          Grow trust
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
        {atTop ? 'You are at the top tier — keep it up.' : `Next tier at ${target}`}
      </p>
    </div>
  );
};

export default CompactTrustCard;
