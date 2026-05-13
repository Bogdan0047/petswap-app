import React from 'react';
import { Shield, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustScoreModuleProps {
  reliabilityScore: number;
  averageRating: number;
  completedSwaps: number;
  responseRate: number;
  verificationProgress: number; // 0-4
  totalVerifications?: number;
  variant?: 'compact' | 'full' | 'progress';
  className?: string;
}

const TrustScoreModule = ({
  reliabilityScore,
  averageRating,
  completedSwaps,
  responseRate,
  verificationProgress,
  totalVerifications = 4,
  variant = 'compact',
  className,
}: TrustScoreModuleProps) => {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="flex items-center gap-1 text-[14px] font-semibold">
          <Star size={14} className="text-warning" fill="currentColor" /> {averageRating}
        </span>
        <span className="text-[13px] text-muted-foreground">{completedSwaps} swaps</span>
        <span className="text-[13px] text-muted-foreground">· {reliabilityScore}%</span>
      </div>
    );
  }

  if (variant === 'progress') {
    return (
      <div className={cn('card-elevated p-5', className)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[15px]">Trust progress</p>
            <p className="text-[12px] text-muted-foreground">{verificationProgress}/{totalVerifications} complete</p>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-slow"
            style={{ width: `${(verificationProgress / totalVerifications) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('card-elevated p-5', className)}>
      <div className="grid grid-cols-4 gap-3 text-center mb-4">
        {[
          { value: averageRating, label: 'Rating', icon: <Star size={14} className="text-warning" fill="currentColor" /> },
          { value: `${reliabilityScore}%`, label: 'Reliable' },
          { value: completedSwaps, label: 'Swaps' },
          { value: `${responseRate}%`, label: 'Response' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="flex items-center justify-center gap-0.5">
              {stat.icon}
              <p className="text-[16px] font-bold">{stat.value}</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-muted-foreground">Verification</span>
          <span className="text-[12px] font-semibold">{verificationProgress}/{totalVerifications}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-slow"
            style={{ width: `${(verificationProgress / totalVerifications) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default TrustScoreModule;
