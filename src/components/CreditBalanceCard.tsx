import { Star, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditBalanceCardProps {
  balance: number;
  earned?: number;
  spent?: number;
  bonus?: number;
  isPremium?: boolean;
  variant?: 'compact' | 'homepage' | 'full';
  onViewHistory?: () => void;
  onPrimaryAction?: () => void;
  className?: string;
}

const CreditBalanceCard = ({
  balance,
  earned = 0,
  spent = 0,
  bonus = 0,
  isPremium = false,
  variant = 'homepage',
  onViewHistory,
  onPrimaryAction,
  className,
}: CreditBalanceCardProps) => {
  if (variant === 'compact') {
    return (
      <button
        onClick={onViewHistory}
        className={cn(
          'card-elevated p-4 w-full flex items-center gap-3 text-left transition-all duration-fast active:scale-[0.98]',
          className,
        )}
      >
        <div className="w-10 h-10 rounded-md bg-warning/15 flex items-center justify-center">
          <Star size={20} className="text-warning" fill="currentColor" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-[15px]">{balance} credits</p>
          <p className="text-[12px] text-muted-foreground">Tap to view history</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground" />
      </button>
    );
  }

  if (variant === 'homepage') {
    return (
      <div
        className={cn(
          'card-elevated p-5 relative overflow-hidden',
          className,
        )}
      >
        {/* Decorative ring */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30"
          style={{ background: 'var(--gradient-primary, hsl(var(--primary) / 0.15))' }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[12px] text-muted-foreground font-semibold uppercase tracking-wide">
                Your balance
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[34px] font-bold leading-none">{balance}</span>
                <span className="text-[14px] text-muted-foreground">credits</span>
              </div>
            </div>
            {isPremium && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-premium/15 text-premium px-2 py-1 rounded-full">
                <Sparkles size={10} fill="currentColor" /> +25% boost
              </span>
            )}
          </div>

          <p className="text-[12px] text-muted-foreground italic mb-4">
            Help now, get help later.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="card-flat p-2.5 text-center">
              <p className="text-[14px] font-bold text-success">+{earned}</p>
              <p className="text-[10px] text-muted-foreground">Earned</p>
            </div>
            <div className="card-flat p-2.5 text-center">
              <p className="text-[14px] font-bold text-foreground/70">-{spent}</p>
              <p className="text-[10px] text-muted-foreground">Spent</p>
            </div>
            <div className="card-flat p-2.5 text-center">
              <p className="text-[14px] font-bold text-primary flex items-center justify-center gap-0.5">
                <Sparkles size={11} fill="currentColor" /> {bonus}
              </p>
              <p className="text-[10px] text-muted-foreground">Bonus</p>
            </div>
          </div>

          <div className="flex gap-2">
            {onPrimaryAction && (
              <button onClick={onPrimaryAction} className="btn-primary flex-1 text-[13px] py-2.5">
                Find pet care
              </button>
            )}
            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="btn-outline flex-1 text-[13px] py-2.5 flex items-center justify-center gap-1"
              >
                <TrendingUp size={13} /> History
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // full
  return (
    <div className={cn('card-elevated p-6 text-center relative overflow-hidden', className)}>
      <p className="text-[12px] text-muted-foreground font-semibold uppercase tracking-wide">
        Available credits
      </p>
      <p className="text-[48px] font-bold leading-none mt-1">{balance}</p>
      {isPremium && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-premium/15 text-premium px-2.5 py-1 rounded-full mt-3">
          <Sparkles size={11} fill="currentColor" /> Premium · +25% on swaps
        </span>
      )}
      <p className="text-[13px] text-muted-foreground italic mt-3">Help now, get help later.</p>
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="card-flat p-3">
          <p className="text-[18px] font-bold text-success">+{earned}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Earned</p>
        </div>
        <div className="card-flat p-3">
          <p className="text-[18px] font-bold text-foreground/70">-{spent}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Spent</p>
        </div>
        <div className="card-flat p-3">
          <p className="text-[18px] font-bold text-primary flex items-center justify-center gap-0.5">
            <Sparkles size={13} fill="currentColor" /> {bonus}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Bonus</p>
        </div>
      </div>
    </div>
  );
};

export default CreditBalanceCard;
