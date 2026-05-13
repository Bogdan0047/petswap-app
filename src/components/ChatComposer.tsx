import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

export interface ChatComposerHandle {
  focus: () => void;
  setText: (text: string) => void;
  insertText: (text: string) => void;
}

interface ChatComposerProps {
  /** Async send handler. Should resolve when the message is accepted (or queued). */
  onSend: (body: string) => Promise<void> | void;
  /** Optional typing notifier — fires on each keystroke. */
  onTyping?: () => void;
  /** Optional left-side adornment (e.g. image upload button). */
  leftAdornment?: React.ReactNode;
  /** Paste handler (e.g. for image paste). */
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Pixel inset for on-screen keyboard — pushes composer above keyboard. */
  keyboardInset?: number;
  className?: string;
}

/**
 * World-class chat composer.
 *
 * - Controlled state with instant UI updates
 * - Optimistic clear on send (parent handles the actual append)
 * - Double-tap protection (800ms lock)
 * - Auto-grow textarea up to 6 lines
 * - Enter to send, Shift+Enter for newline
 * - 16px font to prevent iOS zoom-on-focus
 * - Lifts above keyboard via translateY (doesn't affect layout flow)
 * - Send button always above other content (z-index)
 */
const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  (
    {
      onSend,
      onTyping,
      leftAdornment,
      onPaste,
      placeholder = 'Message',
      disabled = false,
      keyboardInset = 0,
      className,
    },
    ref,
  ) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lockRef = useRef(false);

    const autoGrow = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
    }, []);

    const resetHeight = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        setText: (text: string) => {
          setMessage(text);
          requestAnimationFrame(() => {
            autoGrow();
            textareaRef.current?.focus();
          });
        },
        insertText: (text: string) => {
          setMessage((prev) => (prev ? `${prev} ${text}` : text));
          requestAnimationFrame(() => {
            autoGrow();
            textareaRef.current?.focus();
          });
        },
      }),
      [autoGrow],
    );

    const trimmed = message.trim();
    const canSend = trimmed.length > 0 && !sending && !disabled;

    const handleSend = useCallback(async () => {
      if (lockRef.current) return;
      const body = message.trim();
      if (!body) return;

      lockRef.current = true;
      setSending(true);
      // Optimistic clear — feels instant
      setMessage('');
      resetHeight();
      haptic('light');

      try {
        await onSend(body);
      } catch {
        // Parent owns visible validation / failed-bubble retry states.
      } finally {
        setSending(false);
        // Brief debounce against double-fire (Enter + click on iOS)
        setTimeout(() => {
          lockRef.current = false;
        }, 300);
      }
    }, [message, onSend, resetHeight, autoGrow]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      onTyping?.();
      autoGrow();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    };

    return (
      <div
        className={cn(
          'relative z-20 px-3 pt-2 bg-background border-t border-border',
          'flex items-end gap-2',
          className,
        )}
        style={{
          // Lift above keyboard without affecting parent flex layout
          transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
          paddingBottom:
            keyboardInset > 0
              ? '8px'
              : 'max(env(safe-area-inset-bottom, 8px), 8px)',
          transition: 'transform 150ms ease-out',
        }}
      >
        {leftAdornment}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Message"
          enterKeyHint="send"
          className={cn(
            'flex-1 px-4 py-2.5 rounded-3xl bg-muted text-foreground',
            'placeholder:text-muted-foreground resize-none leading-snug',
            'focus:outline-none focus:ring-2 focus:ring-primary/25',
            'max-h-36 transition-shadow',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
          style={{ fontSize: '16px' /* prevents iOS zoom-on-focus */ }}
        />

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          onClick={handleSend}
          disabled={!canSend}
          aria-label={sending ? 'Sending' : 'Send message'}
          className={cn(
            'relative z-50 h-11 w-11 flex items-center justify-center rounded-full shrink-0 pointer-events-auto touch-manipulation',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            canSend
              ? 'bg-primary text-primary-foreground shadow-md active:scale-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {sending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} className={cn('-ml-0.5 transition-transform', canSend && 'translate-x-px')} />
          )}
        </button>
      </div>
    );
  },
);

ChatComposer.displayName = 'ChatComposer';

export default ChatComposer;
