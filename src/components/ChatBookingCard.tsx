import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ChatBooking } from '@/hooks/useRealtimeChat';
import { sendAppEmail, sendPetSwapEmail, getProfileContact } from '@/lib/sendAppEmail';
import { scheduleAppEmail } from '@/lib/scheduleAppEmail';
import { recordCommEvent, markCommConverted } from '@/lib/orchestrate';
import { openPaywall } from '@/lib/paywallStore';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

interface ChatBookingCardProps {
  booking: ChatBooking;
  myUserId: string;
  otherFirstName: string;
  onCompleted?: (booking: ChatBooking) => void;
}

const fmtRange = (startISO: string, endISO: string) => {
  try {
    const s = new Date(startISO);
    const e = new Date(endISO);
    const sameDay = s.toDateString() === e.toDateString();
    const dayFmt: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    if (sameDay) {
      return `${s.toLocaleDateString([], dayFmt)} · ${s.toLocaleTimeString([], timeFmt)}–${e.toLocaleTimeString([], timeFmt)}`;
    }
    return `${s.toLocaleDateString([], dayFmt)} ${s.toLocaleTimeString([], timeFmt)} → ${e.toLocaleDateString([], dayFmt)} ${e.toLocaleTimeString([], timeFmt)}`;
  } catch {
    return `${startISO} – ${endISO}`;
  }
};

const ChatBookingCard = ({ booking, myUserId, otherFirstName, onCompleted }: ChatBookingCardProps) => {
  const [busy, setBusy] = useState(false);
  const { isTrustedPlus } = useSubscription();

  const isOwner = booking.owner_id === myUserId;
  const myConfirmedAt = isOwner ? booking.confirmed_by_owner_at : booking.confirmed_by_helper_at;
  const otherConfirmedAt = isOwner ? booking.confirmed_by_helper_at : booking.confirmed_by_owner_at;
  const myCompletedAt = isOwner ? booking.completed_by_owner_at : booking.completed_by_helper_at;
  const otherCompletedAt = isOwner ? booking.completed_by_helper_at : booking.completed_by_owner_at;

  const ended = useMemo(() => Date.parse(booking.end_at) < Date.now(), [booking.end_at]);

  const handleConfirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('confirm_chat_booking', { _booking_id: booking.id });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "booking"));
      return;
    }
    toast.success('Confirmed 🎉');

    // STREAK + micro-reward dispatch (subtle confetti via global event).
    void import('@/lib/streaks').then(({ recordStreakActivity }) =>
      recordStreakActivity('booking_confirmed').then(() =>
        window.dispatchEvent(new CustomEvent('petswap:streak-changed')),
      ),
    );
    window.dispatchEvent(new CustomEvent('petswap:celebrate', { detail: { kind: 'booking' } }));
    // Phase 3 viral loop: prompt to invite a friend at this high-emotion moment.
    window.dispatchEvent(new CustomEvent('petswap:invite-prompt', { detail: { kind: 'booking' } }));

    // CONVERSION TRACKING — flip the most recent chat→booking nudge / message
    // push for this user to converted=true. Best-effort.
    void supabase.rpc('mark_push_converted', {
      _user_id: myUserId, _type: 'booking_confirmed', _conversion: 'booking_confirmed',
    });
    void supabase.rpc('mark_push_converted', {
      _user_id: myUserId, _type: 'message', _conversion: 'booking_confirmed',
    });
    // Cross-channel orchestration: this booking IS the conversion target for
    // the prior match_created event in this conversation.
    if (booking.conversation_id) {
      void markCommConverted(myUserId, 'match_created', booking.conversation_id, 'booking_created');
    }
    // When the second confirmation lands and the booking flips to 'confirmed',
    // email both parties via sendPetSwapEmail (respects booking_notifications,
    // logs to email_events, server-side dedupes per booking).
    const updated = data as ChatBooking | null;
    if (updated?.status === 'confirmed') {
      const otherId = isOwner ? updated.helper_id : updated.owner_id;
      const dates = fmtRange(updated.start_at, updated.end_at);
      const dedupe = `booking-${booking.id}`;
      const location = updated.pickup_notes ?? null;

      // FUNNEL: booking_confirmed (deduped per booking per user)
      void import('@/lib/conversionEvents').then(({ recordConversionEvent }) => {
        recordConversionEvent({
          userId: myUserId,
          eventType: 'booking_confirmed',
          sourceEventId: booking.id,
          conversationId: booking.conversation_id,
          bookingId: booking.id,
        });
        recordConversionEvent({
          userId: otherId,
          eventType: 'booking_confirmed',
          sourceEventId: booking.id,
          conversationId: booking.conversation_id,
          bookingId: booking.id,
        });
      });

      void (async () => {
        const [me, other, petRow] = await Promise.all([
          getProfileContact(myUserId),
          getProfileContact(otherId),
          updated.pet_id
            ? supabase.from('pets').select('name').eq('id', updated.pet_id).maybeSingle()
            : Promise.resolve({ data: null } as { data: { name: string } | null }),
        ]);
        const petName = petRow?.data?.name ?? null;

        // Email me about other
        void sendPetSwapEmail({
          userId: myUserId,
          emailType: 'booking-confirmation',
          dedupeKey: dedupe,
          idempotencyKey: `booking-confirm-${booking.id}-${myUserId}`,
          templateData: {
            firstName: me.firstName,
            otherUser: otherFirstName,
            dates,
            petName,
            location,
            startAt: updated.start_at,
            bookingUrl: `https://petswap.co.uk/chat/${otherId}`,
          },
        });

        // Email other about me
        void sendPetSwapEmail({
          userId: otherId,
          emailType: 'booking-confirmation',
          dedupeKey: dedupe,
          idempotencyKey: `booking-confirm-${booking.id}-${otherId}`,
          templateData: {
            firstName: other.firstName,
            otherUser: me.firstName,
            dates,
            petName,
            location,
            startAt: updated.start_at,
            bookingUrl: `https://petswap.co.uk/chat/${myUserId}`,
          },
        });
      })();

      // BOOKING CONFIRMED PUSH — both users.
      // - Server enforces booking pref + quiet hours (queues if needed).
      // - Idempotency key prevents duplicates on retries / status re-saves.
      // - Fail-safe: never throws; never blocks confirmation. Email is the fallback.
      void (async () => {
        try {
          const { sendPush } = await import('@/lib/sendPush');
          const otherIdLocal = isOwner ? updated.helper_id : updated.owner_id;

          // Skip if either side is deleted / pending deletion.
          const { data: liveProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, account_status, deleted_at')
            .in('id', [myUserId, otherIdLocal]);
          const live = (id: string) => {
            const p = (liveProfiles ?? []).find((r) => r.id === id);
            return !!p && p.account_status === 'active' && !p.deleted_at;
          };
          if (!live(myUserId) || !live(otherIdLocal)) return;

          const myName = (liveProfiles ?? []).find((r) => r.id === myUserId)?.first_name?.trim() || 'someone';
          const otherName = (liveProfiles ?? []).find((r) => r.id === otherIdLocal)?.first_name?.trim() || otherFirstName || 'your match';

          // Spec copy — trust + emotion.
          const titleText = 'Your PetSwap is confirmed 🎉';
          const bodyForMe = `You're all set with ${otherName}. Great choice — most bookings complete successfully.`;
          const bodyForOther = `You're all set with ${myName}. Great choice — most bookings complete successfully.`;

          // Cross-channel orchestration: log push for the unified timeline.
          // No fallback — booking confirmation email already fires immediately
          // above (separate dedupe key), so the orchestrator just observes.
          void recordCommEvent({
            userId: myUserId,
            eventType: 'booking_confirmed',
            sourceEventId: booking.id,
            primaryChannel: 'push',
            fallbackChannel: 'none',
            metadata: { booking_id: booking.id, other_user_id: otherIdLocal },
          });
          void recordCommEvent({
            userId: otherIdLocal,
            eventType: 'booking_confirmed',
            sourceEventId: booking.id,
            primaryChannel: 'push',
            fallbackChannel: 'none',
            metadata: { booking_id: booking.id, other_user_id: myUserId },
          });
          void sendPush({
            userId: myUserId,
            type: 'booking_confirmed',
            title: titleText,
            body: bodyForMe,
            deepLink: `/booking/${booking.id}`,
            idempotencyKey: `booking_confirmed:${booking.id}:${myUserId}`,
            sourceEventId: booking.id,
            metadata: {
              type: 'booking_confirmed',
              booking_id: booking.id,
              other_user_id: otherIdLocal,
              start_at: updated.start_at ?? null,
            },
          });

          void sendPush({
            userId: otherIdLocal,
            type: 'booking_confirmed',
            title: titleText,
            body: bodyForOther,
            deepLink: `/booking/${booking.id}`,
            idempotencyKey: `booking_confirmed:${booking.id}:${otherIdLocal}`,
            sourceEventId: booking.id,
            metadata: {
              type: 'booking_confirmed',
              booking_id: booking.id,
              other_user_id: myUserId,
              start_at: updated.start_at ?? null,
            },
          });

          // OPTIONAL FOLLOW-UP: +6h "say hello 👋" push.
          // Drainer cancels at send-time if a message has been sent in the
          // conversation by then. Idempotency keys prevent any double-send.
          const at6h = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
          const followups = [
            {
              user_id: myUserId,
              other_user_id: otherIdLocal,
              other_name: otherName,
              key: `booking_say_hello_6h:${booking.id}:${myUserId}`,
            },
            {
              user_id: otherIdLocal,
              other_user_id: myUserId,
              other_name: myName,
              key: `booking_say_hello_6h:${booking.id}:${otherIdLocal}`,
            },
          ];
          const rows = followups.map((f) => ({
            user_id: f.user_id,
            notification_type: 'message',
            title: `Say hello to ${f.other_name} 👋`,
            body: 'Start chatting to coordinate your PetSwap.',
            deep_link: updated.conversation_id
              ? `/messages/${updated.conversation_id}`
              : `/booking/${booking.id}`,
            idempotency_key: f.key,
            source_event_id: booking.id,
            metadata: {
              type: 'booking_say_hello_6h',
              booking_id: booking.id,
              conversation_id: updated.conversation_id ?? null,
              other_user_id: f.other_user_id,
            },
            status: 'queued' as const,
            scheduled_for: at6h,
          }));
          await supabase.from('pending_push_jobs')
            .upsert(rows, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
        } catch (e) {
          console.warn('[ChatBookingCard] booking push failed', e);
        }
      })();
      void import('@/lib/pushClient').then(({ maybePromptForPush }) =>
        maybePromptForPush('first_booking'),
      );
    }
  };

  const handleComplete = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('mark_chat_booking_completed', { _booking_id: booking.id });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "booking"));
      return;
    }
    toast.success('Marked complete');
    const updated = data as ChatBooking | null;
    if (updated?.status === 'completed') {
      onCompleted?.(updated);

      // Post-booking paywall — soft upsell after a successful swap.
      if (!isTrustedPlus) {
        setTimeout(() => openPaywall({ trigger: 'post_booking' }), 1800);
      }

      // Both parties confirmed completion → schedule review-request email
      // for both users 12 hours later (within the 12–24h spec window).
      // The petswap-email-automation cron drains due jobs every 6h and
      // dispatches via send-petswap-email (respects review_notifications
      // preference, server-side dedupes per booking via dedupeKey).
      const otherId = isOwner ? updated.helper_id : updated.owner_id;
      const sendAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // +12h
      const dates = fmtRange(updated.start_at, updated.end_at);
      void (async () => {
        const [me, other, petRow] = await Promise.all([
          getProfileContact(myUserId),
          getProfileContact(otherId),
          updated.pet_id
            ? supabase.from('pets').select('name').eq('id', updated.pet_id).maybeSingle()
            : Promise.resolve({ data: null } as { data: { name: string } | null }),
        ]);
        const petName = petRow?.data?.name ?? null;
        const dedupe = `booking-${booking.id}`;
        const reminderAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // +72h (3d)
        const swapId = updated.swap_id ?? null;

        // Schedule for me
        void scheduleAppEmail({
          userId: myUserId,
          emailType: 'review-request',
          dedupeKey: dedupe,
          scheduledFor: sendAt,
          templateData: {
            firstName: me.firstName,
            otherFirstName: otherFirstName,
            petName,
            dates,
            reviewUrl: `https://petswap.co.uk/chat/${otherId}`,
          },
        });
        void scheduleAppEmail({
          userId: myUserId,
          emailType: 'review-reminder-3d',
          dedupeKey: dedupe,
          scheduledFor: reminderAt,
          templateData: {
            firstName: me.firstName,
            otherFirstName: otherFirstName,
            petName,
            reviewUrl: `https://petswap.co.uk/chat/${otherId}`,
            swapId,
          },
        });

        // Schedule for other
        void scheduleAppEmail({
          userId: otherId,
          emailType: 'review-request',
          dedupeKey: dedupe,
          scheduledFor: sendAt,
          templateData: {
            firstName: other.firstName,
            otherFirstName: me.firstName,
            petName,
            dates,
            reviewUrl: `https://petswap.co.uk/chat/${myUserId}`,
          },
        });
        void scheduleAppEmail({
          userId: otherId,
          emailType: 'review-reminder-3d',
          dedupeKey: dedupe,
          scheduledFor: reminderAt,
          templateData: {
            firstName: other.firstName,
            otherFirstName: me.firstName,
            petName,
            reviewUrl: `https://petswap.co.uk/chat/${myUserId}`,
            swapId,
          },
        });
      })();
    }
  };

  const statusPill = (() => {
    switch (booking.status) {
      case 'proposed':
        return { label: 'Proposed', tone: 'bg-warning/15 text-warning' };
      case 'confirmed':
        return { label: 'Confirmed', tone: 'bg-primary/15 text-primary' };
      case 'completed':
        return { label: 'Completed', tone: 'bg-success/15 text-success' };
      case 'cancelled':
        return { label: 'Cancelled', tone: 'bg-muted text-muted-foreground' };
    }
  })();

  return (
    <div className="card-elevated p-4 my-2 max-w-[88%] mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <CalendarDays size={12} /> Booking
        </div>
        <span className={cn('text-[10.5px] font-bold px-2 py-0.5 rounded-full', statusPill.tone)}>
          {statusPill.label}
        </span>
      </div>

      <p className="font-semibold text-[14px] leading-snug">{fmtRange(booking.start_at, booking.end_at)}</p>
      <p className="text-[11.5px] text-muted-foreground mt-0.5">
        {booking.credits_amount} credit{booking.credits_amount === 1 ? '' : 's'} · {isOwner ? `You're the owner` : `You're helping`}
      </p>

      {booking.pickup_notes && (
        <div className="mt-3 p-2.5 bg-muted/40 rounded-md">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Pickup / dropoff</p>
          <p className="text-[12.5px] leading-relaxed">{booking.pickup_notes}</p>
        </div>
      )}

      {/* Dual-confirmation status */}
      {(booking.status === 'proposed' || booking.status === 'confirmed') && (
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', myConfirmedAt ? 'bg-primary' : 'bg-border')} />
            You {myConfirmedAt ? 'confirmed' : 'pending'}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className={cn('w-1.5 h-1.5 rounded-full', otherConfirmedAt ? 'bg-primary' : 'bg-border')} />
            {otherFirstName} {otherConfirmedAt ? 'confirmed' : 'pending'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {booking.status === 'proposed' && !myConfirmedAt && (
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="btn-primary flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirm
          </button>
        )}
        {booking.status === 'confirmed' && !ended && (
          <div className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground py-2.5">
            <Clock size={13} /> Both confirmed — see you {new Date(booking.start_at).toLocaleDateString([], { weekday: 'short' })}
          </div>
        )}
        {booking.status === 'confirmed' && ended && !myCompletedAt && (
          <button
            onClick={handleComplete}
            disabled={busy}
            className="btn-primary flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Mark complete
          </button>
        )}
        {booking.status === 'confirmed' && ended && myCompletedAt && !otherCompletedAt && (
          <p className="flex-1 text-center text-[12px] text-muted-foreground py-2.5">
            Waiting for {otherFirstName} to confirm completion
          </p>
        )}
        {booking.status === 'completed' && (
          <p className="flex-1 text-center text-[12px] text-success font-semibold py-2.5 inline-flex items-center justify-center gap-1.5">
            <Check size={13} /> Credits settled
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatBookingCard;
