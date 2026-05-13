import { Home, Compass, MessageCircle, Bell, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnreadCount } from '@/hooks/useUnreadCount';

const tabs = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/messages', icon: MessageCircle, label: 'Messages', badgeKey: 'messages' as const },
  { path: '/activity', icon: Bell, label: 'Activity' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2.5">
        {tabs.map(({ path, icon: Icon, label, badgeKey }) => {
          const isActive = location.pathname === path;
          const showBadge = badgeKey === 'messages' && unread > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 rounded-[14px] transition-all duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {showBadge && (
                  <span
                    aria-label={`${unread} unread messages`}
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-[18px] text-center shadow-sm ring-2 ring-card"
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
