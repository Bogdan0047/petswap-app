import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotificationFeed } from '@/lib/notificationStore';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

/**
 * Header bell. When there are unread items it nudges with a tiny wiggle on
 * mount — single-shot, fully compositor-driven, no layout impact.
 */
const HomeNotificationBell = ({ className }: Props) => {
  const navigate = useNavigate();
  const { unread } = useNotificationFeed();
  const wiggle = unread > 0;
  return (
    <button
      onClick={() => navigate('/notifications')}
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      className={cn(
        'relative w-11 h-11 rounded-full bg-muted flex items-center justify-center tap-feedback',
        className,
      )}
    >
      <Bell size={18} className={cn(wiggle && 'animate-bell-wiggle origin-top')} />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

export default HomeNotificationBell;
