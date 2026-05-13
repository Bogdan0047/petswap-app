import { useEffect, useState } from 'react';
import { Heart, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/data/mockData';

interface Props {
  isPremium: boolean;
  /** Currently-favourited helpers who are online right now. */
  availableFavourites: User[];
  onView: (helperId: string) => void;
  onUpgrade?: () => void;
  className?: string;
}

const DISMISS_KEY = 'petswap.favAlerts.dismissedAt.v1';
const dayMs = 24 * 60 * 60 * 1000;

const readNumber = (key: string): number | null => {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};

/**
 * Favourite-helper availability alert. Only renders when:
 *  - user is premium AND has favourited helpers who are online, OR
 *  - user is free with online favourites and a soft upgrade nudge is appropriate.
 *
 * Auto-dismissed for 24h after the user closes it (no spam).
 */
const FavouriteAvailabilityAlert = ({
  isPremium,
  availableFavourites,
  onView,
  onUpgrade,
  className,
}: Props) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const at = readNumber(DISMISS_KEY);
    if (at && Date.now() - at < dayMs) setDismissed(true);
  }, []);

  if (dismissed || availableFavourites.length === 0) return null;

  const top = availableFavourites[0];
  const others = availableFavourites.length - 1;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <button
      onClick={() => (isPremium ? onView(top.id) : onUpgrade?.())}
      className={cn(
        'w-full p-4 rounded-lg text-left relative overflow-hidden transition-all duration-fast active:scale-[0.99]',
        'bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20',
        className,
      )}
    >
      <div className="flex items-center gap-3 pr-6">
        <div className="w-10 h-10 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
          {isPremium ? <Bell size={17} className="text-primary" /> : <Heart size={17} className="text-primary" fill="currentColor" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary/80 mb-0.5">
            {isPremium ? 'Favourite available' : 'Premium alert'}
          </p>
          <p className="font-semibold text-[14px] leading-tight">
            {isPremium
              ? `${top.firstName} is online now`
              : `${availableFavourites.length} of your favourites just opened up`}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isPremium
              ? others > 0
                ? `+ ${others} more saved helper${others === 1 ? '' : 's'} available`
                : 'Tap to send a request before they get booked'
              : 'Upgrade to be notified instantly when saved helpers open up'}
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      >
        <X size={13} />
      </button>
    </button>
  );
};

export default FavouriteAvailabilityAlert;
