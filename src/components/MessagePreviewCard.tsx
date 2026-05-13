import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from './UserAvatar';

interface MessagePreviewCardProps {
  name: string;
  avatarUrl?: string;
  /** @deprecated kept for backwards compatibility — placeholder is now an initial circle */
  avatarEmoji?: string;
  lastMessage: string;
  time: string;
  unread?: number;
  verified?: boolean;
  online?: boolean;
  trustScore?: number;
  rating?: number;
  petSnippet?: string;
  muted?: boolean;
  onPress?: () => void;
  className?: string;
}

const MessagePreviewCard = ({
  name,
  avatarUrl,
  lastMessage,
  time,
  unread = 0,
  verified = false,
  online = false,
  trustScore,
  rating,
  petSnippet,
  muted: isMuted = false,
  onPress,
  className,
}: MessagePreviewCardProps) => (
  <button
    onClick={onPress}
    className={cn(
      'card-elevated card-lift w-full text-left flex items-center gap-3.5 px-4 py-3.5 transition-all duration-fast',
      isMuted && 'opacity-60',
      className,
    )}
  >
    {/* Avatar with presence dot */}
    <UserAvatar name={name} src={avatarUrl} size={54} rounded={27} online={online} />

    {/* Body */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={cn('text-[15.5px] tracking-tight truncate', unread > 0 ? 'font-bold' : 'font-semibold')}>
            {name}
          </p>
          {verified && (
            <ShieldCheck size={13} className="text-primary flex-shrink-0" aria-label="Verified" />
          )}
          {typeof rating === 'number' && rating > 0 && (
            <span className="hidden xs:inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground font-medium">
              <Star size={10} className="text-warning" fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className={cn('text-[11.5px] flex-shrink-0 tabular-nums', unread > 0 ? 'text-primary font-semibold' : 'text-muted-foreground')}>
          {time}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-[13.5px] truncate leading-snug',
            unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}
        >
          {lastMessage}
        </p>
        {unread > 0 ? (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </div>
      {petSnippet && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">🐾 {petSnippet}</p>
      )}
    </div>
  </button>
);

export default MessagePreviewCard;
