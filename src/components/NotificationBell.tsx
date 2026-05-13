import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationFeed } from '@/lib/notificationStore';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell = ({ className }: NotificationBellProps) => {
  const navigate = useNavigate();
  const { unread } = useNotificationFeed();
  return (
    <button
      onClick={() => navigate('/notifications')}
      className={`relative w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-all duration-fast active:scale-[0.94] ${className ?? ''}`}
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
