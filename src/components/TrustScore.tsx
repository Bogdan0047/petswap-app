import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tierClasses, type TrustTier } from '@/lib/trust';

interface TrustScoreProps {
  score: number;
  tier: TrustTier;
  tierLabel?: string;
  variant?: 'pill' | 'ring' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const TrustScore = React.forwardRef<HTMLSpanElement, TrustScoreProps>(({ score, tier, tierLabel, variant = 'pill', size = 'md', showLabel = true, className }, ref) => {
  const c = tierClasses(tier);

  // Animate ring from 0 → score on mount / score change.
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  if (variant === 'inline') {
    return (
      <span ref={ref} className={cn('inline-flex items-center gap-1 font-semibold', c.text, className)}>
        <ShieldCheck size={size === 'sm' ? 12 : 14} />
        <span className={size === 'sm' ? 'text-[12px]' : 'text-[13px]'}>Trust {score}</span>
      </span>
    );
  }

  if (variant === 'ring') {
    const dim = size === 'lg' ? 88 : size === 'sm' ? 48 : 64;
    const stroke = size === 'lg' ? 7 : size === 'sm' ? 4 : 5;
    const r = (dim - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (animatedScore / 100) * circ;

    return (
      <div ref={ref as React.Ref<HTMLDivElement>} className={cn('inline-flex flex-col items-center gap-1.5', className)}>
        <div className="relative" style={{ width: dim, height: dim }}>
          <svg width={dim} height={dim} className="-rotate-90">
            <circle cx={dim / 2} cy={dim / 2} r={r} strokeWidth={stroke} className="stroke-muted" fill="none" />
            <circle
              cx={dim / 2}
              cy={dim / 2}
              r={r}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className={cn(c.ring)}
              style={{
                stroke: 'currentColor',
                transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold leading-none', size === 'lg' ? 'text-[22px]' : size === 'sm' ? 'text-[14px]' : 'text-[18px]')}>
              {score}
            </span>
            {size !== 'sm' && <span className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">trust</span>}
          </div>
        </div>
        {showLabel && tierLabel && (
          <span className={cn('text-[11px] font-semibold', c.text)}>{tierLabel}</span>
        )}
      </div>
    );
  }

  // pill
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-[11px]' : 'text-[12px]';
  return (
    <span ref={ref} className={cn('inline-flex items-center gap-1 rounded-full font-semibold', c.bg, c.text, padding, text, className)}>
      <ShieldCheck size={size === 'sm' ? 11 : 13} />
      Trust {score}
      {showLabel && tierLabel && size !== 'sm' && <span className="opacity-70 font-medium">· {tierLabel}</span>}
    </span>
  );
});
TrustScore.displayName = 'TrustScore';

export default TrustScore;
