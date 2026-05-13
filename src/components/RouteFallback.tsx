import { Skeleton } from '@/components/Skeleton';

/**
 * Lightweight, Apple-clean skeleton shown while a lazy route chunk loads.
 * Mirrors the typical mobile shell (header + 2 cards) so the swap is calm.
 */
const RouteFallback = () => (
  <div className="min-h-screen bg-background pb-24 animate-fade-in">
    <div className="px-6 pt-8 pb-2 safe-top">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-11 h-11 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
    <div className="px-6 mt-4 space-y-3">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  </div>
);

export default RouteFallback;
