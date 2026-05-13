import React, { useRef } from 'react';
import { AlertCircle, Check, CheckCheck, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { linkify } from '@/lib/linkify';
import { haptic } from '@/lib/haptic';

interface ChatBubbleProps {
  body: string;
  time?: string;
  variant: 'sent' | 'received' | 'system' | 'safety';
  imageUrl?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  showTail?: boolean; // last in a group from same sender
  onRetry?: () => void;
  onImageTap?: (url: string) => void;
  onCopy?: () => void;
  className?: string;
}

const ChatBubble = ({
  body,
  time,
  variant,
  imageUrl,
  status,
  showTail = true,
  onRetry,
  onImageTap,
  onCopy,
  className,
}: ChatBubbleProps) => {
  const longPressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  if (variant === 'system') {
    return (
      <div className={cn('text-center py-2', className)}>
        <p className="text-[12px] text-muted-foreground font-medium bg-muted inline-block px-4 py-1.5 rounded-full">
          {body}
        </p>
      </div>
    );
  }

  if (variant === 'safety') {
    return (
      <div
        className={cn(
          'mx-5 my-2 px-4 py-3 bg-warning/5 border border-warning/15 rounded-xl',
          className,
        )}
      >
        <p className="text-[12px] text-muted-foreground text-center leading-relaxed">{body}</p>
      </div>
    );
  }

  const isSent = variant === 'sent';
  const failed = status === 'failed';

  const handleCopy = () => {
    if (!body) return;
    try {
      navigator.clipboard?.writeText(body);
      haptic('light');
      onCopy?.();
    } catch {
      /* noop */
    }
  };

  const startPress = () => {
    longPressed.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      handleCopy();
    }, 450);
  };

  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className={cn('flex w-full', isSent ? 'justify-end' : 'justify-start', className)}>
      <div className="max-w-[78%] flex flex-col items-stretch">
        <div
          onPointerDown={body ? startPress : undefined}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => {
            if (!body) return;
            e.preventDefault();
            handleCopy();
          }}
          className={cn(
            'px-3.5 py-2.5 text-[15px] leading-[1.35] animate-bubble-pop break-words select-text',
            isSent
              ? failed
                ? 'bg-destructive/10 text-foreground border border-destructive/30'
                : 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            // Rounded corners; squared on the tail side when grouped
            isSent
              ? showTail
                ? 'rounded-[18px] rounded-br-[6px]'
                : 'rounded-[18px] rounded-br-[18px]'
              : showTail
                ? 'rounded-[18px] rounded-bl-[6px]'
                : 'rounded-[18px] rounded-bl-[18px]',
          )}
          style={{ transformOrigin: isSent ? 'bottom right' : 'bottom left' }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              onClick={(e) => {
                e.stopPropagation();
                if (longPressed.current) return;
                onImageTap?.(imageUrl);
              }}
              className={cn(
                'rounded-lg mb-1.5 max-w-full max-h-[280px] object-cover animate-scale-in',
                onImageTap && 'cursor-zoom-in active:opacity-90',
              )}
              loading="lazy"
              draggable={false}
            />
          )}
          {body && (
            <span
              className={cn(
                'whitespace-pre-wrap',
                // Inline links inherit the right contrast colour
                isSent ? '[&_a]:text-primary-foreground' : '[&_a]:text-primary',
              )}
            >
              {linkify(body)}
            </span>
          )}
          {(time || status) && (
            <div
              className={cn(
                'flex items-center justify-end gap-1 mt-0.5 -mb-0.5 select-none',
                isSent ? 'text-primary-foreground/70' : 'text-muted-foreground',
              )}
            >
              {time && <span className="text-[10.5px] tabular-nums">{time}</span>}
              {isSent && status === 'sending' && (
                <span className="w-2.5 h-2.5 rounded-full border border-primary-foreground/50 border-t-transparent animate-spin" />
              )}
              {isSent && status === 'sent' && <Check size={12} className="opacity-80" />}
              {isSent && (status === 'delivered' || status === 'read') && (
                <CheckCheck
                  size={12}
                  className={cn(status === 'read' ? 'text-sky-200' : 'opacity-80')}
                />
              )}
            </div>
          )}
        </div>
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            className="self-end mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-destructive active:opacity-60"
          >
            <AlertCircle size={11} /> Not delivered
            {onRetry && (
              <span className="inline-flex items-center gap-0.5 ml-1 underline">
                <RotateCw size={10} /> Tap to retry
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
