import { Bell, Filter, Heart, Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isPremium: boolean;
  onUpgrade: () => void;
  /** Optional: existing premium users get a "Manage" link instead of upgrade. */
  onManage?: () => void;
  className?: string;
}

const perks = [
  { icon: Zap, label: 'Instant alerts', detail: 'Be first when a request appears nearby' },
  { icon: Filter, label: 'Advanced filters', detail: 'Filter by trust tier, response rate, household type' },
  { icon: Heart, label: 'Favourite alerts', detail: 'Notified the moment a saved helper opens up' },
  { icon: Bell, label: 'Priority placement', detail: 'Your requests rank above standard listings' },
];

/**
 * Premium retention perks card — subtle gold accent, lists the four
 * recurring-value features. Doubles as both a free-tier upsell and a
 * premium-tier benefit reminder.
 */
const PremiumPerksCard = ({ isPremium, onUpgrade, onManage, className }: Props) => {
  return (
    <div
      className={cn(
        'card-elevated p-5 relative overflow-hidden',
        isPremium && 'border-primary/40',
        className,
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            'w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0',
            isPremium ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning',
          )}
        >
          {isPremium ? <Crown size={20} /> : <Sparkles size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {isPremium ? 'Trusted Plus' : 'Upgrade to Premium'}
          </p>
          <p className="font-semibold text-[15px] leading-tight mt-0.5">
            {isPremium ? 'Your premium perks are active' : 'Get more from PetSwap each week'}
          </p>
        </div>
      </div>

      <ul className="space-y-2.5 mb-5">
        {perks.map(p => {
          const Icon = p.icon;
          return (
            <li key={p.label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className={isPremium ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight">{p.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{p.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {isPremium ? (
        onManage && (
          <button
            onClick={onManage}
            className="w-full bg-muted text-foreground rounded-md py-3 text-[13px] font-semibold transition-all duration-fast active:scale-[0.99]"
          >
            Manage subscription
          </button>
        )
      ) : (
        <button
          onClick={onUpgrade}
          className="w-full btn-primary py-3 text-[13px] font-semibold"
        >
          Upgrade — £4.99/month
        </button>
      )}
    </div>
  );
};

export default PremiumPerksCard;
