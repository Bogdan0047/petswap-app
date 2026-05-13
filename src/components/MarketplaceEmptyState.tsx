import { Gift, Compass, Sparkles, ArrowRight } from 'lucide-react';

interface MarketplaceEmptyStateProps {
  title?: string;
  description?: string;
  onInvite: () => void;
  onExpandRadius?: () => void;
  onBecomeFirst?: () => void;
}

/**
 * Premium marketplace empty state. When local supply is thin we offer
 * concrete next steps — invite, expand radius, or become the first
 * trusted helper nearby — instead of a sad icon.
 */
const MarketplaceEmptyState = ({
  title = 'Be one of the first in your area',
  description = "PetSwap is just getting started near you. Help us build a trusted circle of neighbours.",
  onInvite,
  onExpandRadius,
  onBecomeFirst,
}: MarketplaceEmptyStateProps) => (
  <div className="card-elevated p-6 animate-fade-in">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
        <Sparkles size={22} className="text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-[16px] leading-tight">{title}</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>

    <div className="space-y-2 mt-4">
      <button
        onClick={onInvite}
        className="w-full p-3.5 rounded-md bg-primary/5 flex items-center gap-3 transition-all duration-fast active:scale-[0.99] text-left"
      >
        <Gift size={18} className="text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-[13px]">Invite trusted neighbours</p>
          <p className="text-[11px] text-muted-foreground">Both earn 2 credits after their first swap</p>
        </div>
        <ArrowRight size={15} className="text-muted-foreground" />
      </button>

      {onExpandRadius && (
        <button
          onClick={onExpandRadius}
          className="w-full p-3.5 rounded-md bg-muted flex items-center gap-3 transition-all duration-fast active:scale-[0.99] text-left"
        >
          <Compass size={18} className="text-foreground/70 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-[13px]">Widen your radius</p>
            <p className="text-[11px] text-muted-foreground">See trusted helpers within 25 miles</p>
          </div>
          <ArrowRight size={15} className="text-muted-foreground" />
        </button>
      )}

      {onBecomeFirst && (
        <button
          onClick={onBecomeFirst}
          className="w-full p-3.5 rounded-md bg-muted flex items-center gap-3 transition-all duration-fast active:scale-[0.99] text-left"
        >
          <Sparkles size={18} className="text-foreground/70 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-[13px]">Become a trusted helper</p>
            <p className="text-[11px] text-muted-foreground">Verify your profile and offer your first slot</p>
          </div>
          <ArrowRight size={15} className="text-muted-foreground" />
        </button>
      )}
    </div>
  </div>
);

export default MarketplaceEmptyState;
