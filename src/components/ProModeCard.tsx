import { Briefcase, Eye, Calendar, TrendingUp, Crown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Props {
  enabled: boolean;
  effective: boolean;
  isPremium: boolean;
  trialActive: boolean;
  trialDaysLeft: number | null;
  onToggle: (next: boolean) => void;
  onUpgrade: () => void;
  className?: string;
}

const benefits = [
  { icon: Eye, label: 'Visibility boost', detail: 'Rank higher in helper carousels nearby' },
  { icon: TrendingUp, label: 'More opportunities', detail: 'See matched requests sooner than free helpers' },
  { icon: Calendar, label: 'Schedule tools', detail: 'Block-out days, weekly recurring availability' },
];

/**
 * Helper Pro Mode card — opt-in mode for active helpers. Premium subscribers
 * get it free; free helpers can preview for 7 days. No aggressive paywall —
 * the upgrade nudge only appears when the trial expires.
 */
const ProModeCard = ({
  enabled,
  effective,
  isPremium,
  trialActive,
  trialDaysLeft,
  onToggle,
  onUpgrade,
  className,
}: Props) => {
  const trialExpired = !isPremium && enabled && !trialActive && trialDaysLeft === 0;

  return (
    <div
      className={cn(
        'card-elevated p-5 relative overflow-hidden',
        effective && 'border-primary/40',
        className,
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            'w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0',
            effective ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground',
          )}
        >
          <Briefcase size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Helper Pro Mode
            </p>
            {isPremium && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                <Crown size={9} /> Included
              </span>
            )}
            {trialActive && trialDaysLeft !== null && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                {trialDaysLeft}d trial left
              </span>
            )}
          </div>
          <p className="font-semibold text-[15px] leading-tight mt-0.5">
            {effective ? 'Pro Mode is active' : 'Stand out as a helper'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {effective
              ? 'You appear higher in feeds and unlock schedule tools.'
              : 'Higher visibility, more matched requests, schedule tools.'}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Toggle Helper Pro Mode"
        />
      </div>

      <ul className="space-y-2.5 mb-4">
        {benefits.map(b => {
          const Icon = b.icon;
          return (
            <li key={b.label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className={effective ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight">{b.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{b.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {trialExpired && (
        <button
          onClick={onUpgrade}
          className="w-full btn-primary py-3 text-[13px] font-semibold"
        >
          Continue Pro Mode with Premium
        </button>
      )}
    </div>
  );
};

export default ProModeCard;
