import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Sparkles, ShieldCheck } from 'lucide-react';
import TrustScore from './TrustScore';
import type { TrustBreakdown, TrustTier } from '@/lib/trust';
import { cn } from '@/lib/utils';

interface Props {
  breakdown: TrustBreakdown;
  onAction?: () => void;
  className?: string;
}

/** Next-tier ladder used for the "Next: X at Y" copy and progress bar. */
const tierLadder: { tier: TrustTier; threshold: number; label: string }[] = [
  { tier: 'low', threshold: 0, label: 'New member' },
  { tier: 'improving', threshold: 40, label: 'Improving' },
  { tier: 'good', threshold: 60, label: 'Good standing' },
  { tier: 'trusted', threshold: 80, label: 'Trusted member' },
];

const SEEN_TIER_KEY = 'petswap.trustTier.seen.v1';

const TrustProgressCard = ({ breakdown, onAction, className }: Props) => {
  const { score, tier, tierLabel, nextSteps } = breakdown;

  const { nextLabel, nextThreshold, prevThreshold, atTop } = useMemo(() => {
    const idx = tierLadder.findIndex(t => t.tier === tier);
    const current = tierLadder[idx];
    const next = tierLadder[idx + 1];
    if (!next) {
      return {
        nextLabel: current.label,
        nextThreshold: 100,
        prevThreshold: current.threshold,
        atTop: true,
      };
    }
    return {
      nextLabel: next.label,
      nextThreshold: next.threshold,
      prevThreshold: current.threshold,
      atTop: false,
    };
  }, [tier]);

  // Animate the progress bar from 0 to current value on mount.
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  const pct = atTop
    ? 100
    : Math.max(
        4,
        Math.min(
          100,
          ((animatedScore - prevThreshold) / (nextThreshold - prevThreshold)) * 100,
        ),
      );

  const remaining = atTop ? 0 : Math.max(0, nextThreshold - score);

  // Tier unlock celebration — fires once per tier reached.
  const [unlocked, setUnlocked] = useState(false);
  const handledRef = useRef(false);
  useEffect(() => {
    if (handledRef.current) return;
    let lastSeen: TrustTier | null = null;
    try {
      lastSeen = (localStorage.getItem(SEEN_TIER_KEY) as TrustTier | null) ?? null;
    } catch {
      /* noop */
    }
    const ladder = tierLadder.map(t => t.tier);
    const lastIdx = lastSeen ? ladder.indexOf(lastSeen) : -1;
    const currentIdx = ladder.indexOf(tier);
    if (currentIdx > lastIdx) {
      setUnlocked(true);
      try {
        localStorage.setItem(SEEN_TIER_KEY, tier);
      } catch {
        /* noop */
      }
      const id = setTimeout(() => setUnlocked(false), 3200);
      handledRef.current = true;
      return () => clearTimeout(id);
    }
    handledRef.current = true;
  }, [tier]);

  return (
    <div className={cn('card-elevated p-5 relative overflow-hidden', className)}>
      {/* Tier-up celebration overlay */}
      {unlocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="relative w-20 h-20 mb-3">
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <ShieldCheck size={36} strokeWidth={2.5} className="text-primary-foreground" />
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">
            Tier unlocked
          </p>
          <p className="font-bold text-[18px]">{tierLabel}</p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px] text-center">
            Your profile now stands out to neighbours nearby.
          </p>
          <button
            onClick={() => setUnlocked(false)}
            className="mt-4 text-[12px] font-semibold text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <TrustScore score={score} tier={tier} variant="ring" size="lg" showLabel={false} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
            Your trust status
          </p>
          <p className="font-bold text-[18px] leading-tight mt-0.5">{tierLabel}</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {atTop
              ? 'You are at the top tier — keep it up.'
              : `Next: ${nextLabel} at ${nextThreshold}`}
          </p>
        </div>
      </div>

      {/* Animated milestone progress bar */}
      {!atTop && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
            <span>{score} pts</span>
            <span className="text-primary font-semibold">
              {remaining} pt{remaining === 1 ? '' : 's'} to go
            </span>
          </div>
        </div>
      )}

      {nextSteps.length > 0 && !atTop && (
        <div className="space-y-1.5 mb-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Quick wins
          </p>
          {nextSteps.map(s => (
            <div
              key={s.label}
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-surface-muted"
            >
              <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <Check size={11} className="text-primary/40" />
              </div>
              <span className="text-[13px] font-medium flex-1">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAction}
        className="btn-primary w-full text-[14px] py-3 inline-flex items-center justify-center gap-1.5"
      >
        {atTop ? (
          <>
            <Sparkles size={15} /> View your profile
          </>
        ) : (
          <>
            Grow your trust <ArrowUpRight size={16} />
          </>
        )}
      </button>
    </div>
  );
};

export default TrustProgressCard;
