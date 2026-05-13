import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Coins,
  MessageCircle,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import {
  NOTIFICATION_KIND_LABELS,
  dismissNotification,
  markAllRead,
  markRead,
  useNotificationFeed,
  useNotificationPrefs,
  type FeedItem,
  type NotificationPrefs,
} from '@/lib/notificationStore';
import UserAvatar from '@/components/UserAvatar';
import { Switch } from '@/components/ui/switch';
import PushSettings from '@/components/PushSettings';

const iconFor = (kind: FeedItem['kind']) => {
  switch (kind) {
    case 'connection_request':
      return <Users size={18} className="text-primary" />;
    case 'reply':
      return <MessageCircle size={18} className="text-primary" />;
    case 'credits_earned':
      return <Coins size={18} className="text-primary" />;
    default:
      return <Bell size={18} className="text-primary" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { items, unread } = useNotificationFeed();
  const { prefs, setPref } = useNotificationPrefs();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.title = 'Notifications · PetSwap';
  }, []);

  const onItemClick = (item: FeedItem) => {
    markRead(item.id);
    if (item.link) navigate(item.link);
  };

  const onDismiss = (e: React.MouseEvent, item: FeedItem) => {
    e.stopPropagation();
    dismissNotification(item.id);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-6 pb-3 safe-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:scale-90 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="heading-lg leading-tight">Notifications</h1>
          <p className="text-[12px] text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(v => !v)}
          aria-label="Notification settings"
          className="p-2 -mr-2 rounded-full active:scale-90 transition-transform text-muted-foreground"
        >
          <SettingsIcon size={20} />
        </button>
      </div>

      {unread > 0 && (
        <div className="px-6 pb-2">
          <button
            onClick={() => markAllRead(items.map(i => i.id))}
            className="text-[12px] font-semibold text-primary"
          >
            Mark all as read
          </button>
        </div>
      )}

      {showSettings && (
        <div className="px-6 mt-2 mb-4 animate-fade-in">
          <div className="card-elevated p-4 space-y-3">
            <div>
              <p className="font-semibold text-[14px]">What you'll be told</p>
              <p className="text-[11px] text-muted-foreground">
                We bundle similar alerts and limit each to once per few hours so you stay in the loop without the noise.
              </p>
            </div>
            <div className="space-y-2.5">
              {(Object.keys(NOTIFICATION_KIND_LABELS) as (keyof typeof NOTIFICATION_KIND_LABELS)[]).map(k => (
                <label key={k} className="flex items-center justify-between text-[13px]">
                  <span>{NOTIFICATION_KIND_LABELS[k]}</span>
                  <Switch
                    checked={prefs[k as keyof NotificationPrefs] as boolean}
                    onCheckedChange={(v: boolean) => setPref(k as keyof NotificationPrefs, v)}
                  />
                </label>
              ))}
              <div className="border-t border-border pt-2.5">
                <label className="flex items-center justify-between text-[13px]">
                  <span>
                    Quiet hours <span className="text-muted-foreground text-[11px]">(10pm – 7am)</span>
                  </span>
                  <Switch
                    checked={prefs.quietHours}
                    onCheckedChange={(v: boolean) => setPref('quietHours', v)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mt-3">
        {items.length === 0 ? (
          <EmptyState
            emoji="🔔"
            title="Nothing new yet"
            description="We'll let you know about nearby requests, replies and new helpers — without the noise."
          />
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const hasAvatar = !!(item.avatarUserId || item.avatarName);
              return (
                <div
                  key={item.id}
                  className={`relative card-flat p-4 flex items-center gap-3 transition-all duration-fast ${
                    item.read ? 'opacity-70' : 'border-l-2 border-primary'
                  }`}
                >
                  <button
                    onClick={() => onItemClick(item)}
                    className="flex-1 flex items-center gap-3 text-left active:scale-[0.99] transition-transform min-w-0"
                  >
                    {hasAvatar ? (
                      <UserAvatar
                        name={item.avatarName ?? 'Member'}
                        src={item.avatarUrl ?? undefined}
                        size={40}
                        rounded={20}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {iconFor(item.kind)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px] truncate">{item.title}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{item.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.createdAt}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                  <button
                    onClick={e => onDismiss(e, item)}
                    aria-label="Dismiss"
                    className="p-1.5 rounded-full text-muted-foreground hover:bg-muted active:scale-90 transition-all flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            <p className="text-center text-[11px] text-muted-foreground pt-2">
              We send at most a handful of alerts per day. Adjust anytime in settings.
            </p>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Push notifications</h2>
          <PushSettings />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
