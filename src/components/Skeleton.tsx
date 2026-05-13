import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(({ className }, ref) => (
  <div ref={ref} className={cn('skeleton-shimmer rounded-md', className)} />
));
Skeleton.displayName = 'Skeleton';

const SkeletonCard = ({ className }: SkeletonProps) => (
  <div className={cn('card-elevated p-5 space-y-3', className)}>
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-10 w-full rounded-sm" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

const SkeletonMatchCard = ({ className }: SkeletonProps) => (
  <div className={cn('card-elevated p-5', className)}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="w-14 h-14 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
    <div className="flex gap-2 mb-3">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
    <Skeleton className="h-12 w-full rounded-sm mb-3" />
    <div className="flex gap-3">
      <Skeleton className="h-11 flex-1 rounded-md" />
      <Skeleton className="h-11 flex-1 rounded-md" />
    </div>
  </div>
);

const SkeletonMessageRow = ({ className }: SkeletonProps) => (
  <div className={cn('card-elevated p-4 flex items-center gap-4', className)}>
    <Skeleton className="w-[52px] h-[52px] rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

const SkeletonProfileHeader = ({ className }: SkeletonProps) => (
  <div className={cn('card-elevated p-6', className)}>
    <div className="flex items-center gap-4 mb-4">
      <Skeleton className="w-20 h-20 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

const SkeletonCreditCard = ({ className }: SkeletonProps) => (
  <div className={cn('card-elevated p-6 text-center', className)}>
    <Skeleton className="h-10 w-20 mx-auto mb-2" />
    <Skeleton className="h-3 w-24 mx-auto" />
    <div className="flex justify-center gap-8 mt-4">
      <Skeleton className="h-8 w-14" />
      <Skeleton className="h-8 w-14" />
      <Skeleton className="h-8 w-14" />
    </div>
  </div>
);

export {
  Skeleton,
  SkeletonCard,
  SkeletonMatchCard,
  SkeletonMessageRow,
  SkeletonProfileHeader,
  SkeletonCreditCard,
};
