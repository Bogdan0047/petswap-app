import { useState } from 'react';
import { ShieldCheck, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { notifyNewMatch } from '@/lib/notifyNewMatch';
import SafetyTipsCard from './SafetyTipsCard';
import { friendlyError } from '@/lib/friendlyError';

interface MessageRequestGateProps {
  conversationId: string;
  /** The user who initiated the chat — they get the "new match" email when we accept. */
  initiatorUserId?: string;
  initiatorName: string;
  initiatorAvatarUrl?: string;
  firstMessagePreview?: string;
  onAccepted: () => void;
  onDeclined: () => void;
}

/**
 * Shown to the recipient when a stranger sends a first message.
 * Until they accept, the chat is read-only and no replies can be sent.
 */
const MessageRequestGate = ({
  conversationId,
  initiatorUserId,
  initiatorName,
  firstMessagePreview,
  onAccepted,
  onDeclined,
}: MessageRequestGateProps) => {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const accept = async () => {
    setBusy('accept');
    const { error } = await supabase.rpc('accept_conversation', {
      _conversation_id: conversationId,
    });
    setBusy(null);
    if (error) {
      toast.error(friendlyError(error, "message"));
      return;
    }
    toast.success(`You're now chatting with ${initiatorName}`);
    // Micro-reward: subtle celebration on match accept (Phase 2 dopamine loop).
    window.dispatchEvent(new CustomEvent('petswap:celebrate', { detail: { kind: 'match' } }));
    onAccepted();

    // Notify BOTH users of the new match. Fire-and-forget — never block UI.
    // Server-side dedupe (match-conv-<id>) ensures one email per user per conversation.
    if (initiatorUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        void notifyNewMatch({
          matchKey: `conv-${conversationId}`,
          userAId: initiatorUserId,
          userBId: user.id,
          conversationId,
          chatUrlForA: `https://petswap.co.uk/chat/${user.id}`,
          chatUrlForB: `https://petswap.co.uk/chat/${initiatorUserId}`,
        });
      }
    }
  };

  const decline = async () => {
    setBusy('decline');
    const { error } = await supabase.rpc('decline_conversation', {
      _conversation_id: conversationId,
    });
    setBusy(null);
    if (error) {
      toast.error(friendlyError(error, "message"));
      return;
    }
    toast('Request declined');
    onDeclined();
  };

  return (
    <div className="px-5 py-6 space-y-4 animate-fade-in">
      <div className="card-elevated p-5 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <ShieldCheck size={22} className="text-primary" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">
          New message request
        </p>
        <h3 className="font-bold text-[17px] mb-1">{initiatorName} wants to chat</h3>
        <p className="text-[12.5px] text-muted-foreground mb-3 leading-relaxed">
          You haven't connected before. Accept to start chatting, or decline if
          this isn't relevant. They won't be notified if you decline.
        </p>

        {firstMessagePreview && (
          <blockquote className="text-left bg-muted/60 rounded-xl px-3 py-2.5 mb-4">
            <p className="text-[13px] leading-snug text-foreground/85 line-clamp-4">
              "{firstMessagePreview}"
            </p>
          </blockquote>
        )}

        <div className="flex gap-2">
          <button
            onClick={decline}
            disabled={!!busy}
            className="btn-outline flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            {busy === 'decline' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Decline
          </button>
          <button
            onClick={accept}
            disabled={!!busy}
            className="btn-primary flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            {busy === 'accept' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accept
          </button>
        </div>
      </div>

      <SafetyTipsCard compact />
    </div>
  );
};

export default MessageRequestGate;
