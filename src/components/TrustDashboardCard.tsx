import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import TrustScore from './TrustScore';
import type { TrustBreakdown } from '@/lib/trust';

interface Props {
  breakdown: TrustBreakdown;
  onAction?: () => void;
  className?: string;
}

const TrustDashboardCard = ({ breakdown, onAction, className }: Props) => {
  const { score, tier, tierLabel, nextSteps } = breakdown;

  return (
    <div className={cn('card-elevated p-5', className)}>
      <div className="flex items-center gap-4 mb-4">
        <TrustScore score={score} tier={tier} variant="ring" size="lg" showLabel={false} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-semibold">Your trust status</p>
          <p className="font-bold text-[18px] leading-tight mt-0.5">{tierLabel}</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {nextSteps.length === 0
              ? 'You have everything to be highly trusted.'
              : `${nextSteps.length} step${nextSteps.length > 1 ? 's' : ''} to reach a higher tier`}
          </p>
        </div>
      </div>

      {nextSteps.length > 0 && (
        <div className="space-y-2 mb-3">
          {nextSteps.map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-[13px] font-medium flex-1">{s.label}</span>
              <ChevronRight size={15} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      <button onClick={onAction} className="btn-primary w-full text-[14px] py-3 flex items-center justify-center gap-1.5">
        Increase trust <ArrowUpRight size={16} />
      </button>
    </div>
  );
};

export default TrustDashboardCard;
