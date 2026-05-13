import { supabase } from '@/integrations/supabase/client';
import { sendPetSwapEmail } from '@/lib/sendAppEmail';
import { scheduleAppEmail } from '@/lib/scheduleAppEmail';
import { recordCommEvent } from '@/lib/orchestrate';
import { recordConversionEvent } from '@/lib/conversionEvents';

/**
 * Notify both users of a new match/connection.
 *
 * Sends the `new-match` email to BOTH user A and user B immediately, then
 * schedules two behavioural follow-ups (+24h and +72h) for each side. The
 * automation cron skips a follow-up at send-time when the recipient has
 * already messaged in the conversation, so no spam if they reply quickly.
 *
 * Respects each user's match_notifications preference.
 * Fire-and-forget: never throws, never blocks the UI.
 */
export async function notifyNewMatch(params: {
  /** Stable id for the match (e.g. connection.id or conversation.id). */
  matchKey: string;
  userAId: string;
  userBId: string;
  /** Optional conversation id used by follow-ups to skip if user already messaged. */
  conversationId?: string;
  /** Where each recipient should land when they tap "Open chat". */
  chatUrlForA?: string;
  chatUrlForB?: string;
}): Promise<void> {
  const { matchKey, userAId, userBId, conversationId } = params;
  if (!matchKey || !userAId || !userBId || userAId === userBId) return;

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, avatar_url, trust_score, area, account_status, deleted_at')
      .in('id', [userAId, userBId]);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const a = byId.get(userAId);
    const b = byId.get(userBId);

    // Safety: skip everything if either side is deleted / pending deletion.
    const isLive = (p?: { account_status?: string | null; deleted_at?: string | null }) =>
      !!p && p.account_status === 'active' && !p.deleted_at;
    const aLive = isLive(a);
    const bLive = isLive(b);

    const dedupe = `match-${matchKey}`;
    const chatA = params.chatUrlForA ?? `https://petswap.co.uk/chat/${userBId}`;
    const chatB = params.chatUrlForB ?? `https://petswap.co.uk/chat/${userAId}`;

    // Funnel: match_created for both sides (deduped on matchKey)
    void recordConversionEvent({
      userId: userAId,
      eventType: 'match_created',
      sourceEventId: matchKey,
      conversationId: conversationId ?? null,
    });
    void recordConversionEvent({
      userId: userBId,
      eventType: 'match_created',
      sourceEventId: matchKey,
      conversationId: conversationId ?? null,
    });

    // Initial match emails — both sides
    void sendPetSwapEmail({
      userId: userAId,
      emailType: 'new-match',
      dedupeKey: dedupe,
      idempotencyKey: `new-match-${matchKey}-${userAId}`,
      templateData: {
        firstName: a?.first_name ?? null,
        otherFirstName: b?.first_name ?? null,
        otherAvatarUrl: b?.avatar_url ?? null,
        otherTrustScore: typeof b?.trust_score === 'number' ? b.trust_score : null,
        otherLocation: b?.area ?? null,
        chatUrl: chatA,
      },
    });

    void sendPetSwapEmail({
      userId: userBId,
      emailType: 'new-match',
      dedupeKey: dedupe,
      idempotencyKey: `new-match-${matchKey}-${userBId}`,
      templateData: {
        firstName: b?.first_name ?? null,
        otherFirstName: a?.first_name ?? null,
        otherAvatarUrl: a?.avatar_url ?? null,
        otherTrustScore: typeof a?.trust_score === 'number' ? a.trust_score : null,
        otherLocation: a?.area ?? null,
        chatUrl: chatB,
      },
    });

    // Schedule follow-ups (+24h, +72h). Skip-at-send if user already messaged.
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const in72h = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const scheduleNudge = (
      type: 'match-nudge-24h' | 'match-nudge-72h',
      when: Date,
      userId: string,
      ownFirstName?: string | null,
      otherFirstName?: string | null,
      chatUrl?: string,
    ) => {
      void scheduleAppEmail({
        userId,
        emailType: type,
        dedupeKey: dedupe,
        scheduledFor: when,
        templateData: {
          firstName: ownFirstName ?? null,
          otherFirstName: otherFirstName ?? null,
          chatUrl: chatUrl ?? `https://petswap.co.uk/messages`,
          conversationId: conversationId ?? null,
        },
      });
    };

    scheduleNudge('match-nudge-24h', in24h, userAId, a?.first_name, b?.first_name, chatA);
    scheduleNudge('match-nudge-72h', in72h, userAId, a?.first_name, b?.first_name, chatA);
    scheduleNudge('match-nudge-24h', in24h, userBId, b?.first_name, a?.first_name, chatB);
    scheduleNudge('match-nudge-72h', in72h, userBId, b?.first_name, a?.first_name, chatB);

    // Chat → booking nudge: 24h after match. Skip-at-send if chat hasn't
    // started OR a confirmed booking already exists for the conversation.
    const scheduleChatNudge = (
      userId: string,
      ownFirstName?: string | null,
      otherFirstName?: string | null,
      chatUrl?: string,
    ) => {
      void scheduleAppEmail({
        userId,
        emailType: 'chat-no-booking-24h',
        dedupeKey: dedupe,
        scheduledFor: in24h,
        templateData: {
          firstName: ownFirstName ?? null,
          otherFirstName: otherFirstName ?? null,
          bookingUrl: chatUrl ?? `https://petswap.co.uk/messages`,
          conversationId: conversationId ?? null,
        },
      });
    };
    scheduleChatNudge(userAId, a?.first_name, b?.first_name, chatA);
    scheduleChatNudge(userBId, b?.first_name, a?.first_name, chatB);

    // NEW MATCH PUSH — both sides, separate logs/dedupe from emails.
    // Server enforces match-pref opt-in, quiet hours, and idempotency.
    // Fail-safe: never throws; never blocks the match flow.
    const deepLinkFor = (otherId: string) =>
      conversationId ? `/messages/${conversationId}` : `/profile/${otherId}`;

    // Schedule MATCH NUDGE pushes (+24h, +72h). Drainer cancels at send-time
    // if any messages or bookings exist in the conversation by then.
    void (async () => {
      if (!aLive || !bLive) return;
      const now = Date.now();
      const at2h = new Date(now + 2 * 60 * 60 * 1000).toISOString();
      const at24 = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      const at72 = new Date(now + 72 * 60 * 60 * 1000).toISOString();

      // SPEED-TO-ACTION 2h push — cancelled if any message is exchanged.
      const speedRows = [
        { user_id: userAId, otherId: userBId, otherName: b?.first_name ?? 'them' },
        { user_id: userBId, otherId: userAId, otherName: a?.first_name ?? 'them' },
      ].map((j) => ({
        user_id: j.user_id,
        notification_type: 'match' as const,
        title: 'Send the first message 👋',
        body: `Sending a message now boosts your chances 3× with ${j.otherName}.`,
        deep_link: deepLinkFor(j.otherId),
        idempotency_key: `match_speed_2h:${matchKey}:${j.user_id}`,
        source_event_id: matchKey,
        metadata: {
          type: 'match_speed_2h',
          match_id: matchKey,
          other_user_id: j.otherId,
          conversation_id: conversationId ?? null,
        },
        status: 'queued' as const,
        scheduled_for: at2h,
      }));
      await supabase.from('pending_push_jobs')
        .upsert(speedRows, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });


      const jobs = [
        {
          user_id: userAId, otherId: userBId, otherName: b?.first_name ?? 'someone',
          wave: '24h' as const, scheduled_for: at24,
        },
        {
          user_id: userBId, otherId: userAId, otherName: a?.first_name ?? 'someone',
          wave: '24h' as const, scheduled_for: at24,
        },
        {
          user_id: userAId, otherId: userBId, otherName: b?.first_name ?? 'someone',
          wave: '72h' as const, scheduled_for: at72,
        },
        {
          user_id: userBId, otherId: userAId, otherName: a?.first_name ?? 'someone',
          wave: '72h' as const, scheduled_for: at72,
        },
      ];

      const rows = jobs.map((j) => {
        const title = j.wave === '24h'
          ? `Still thinking about ${j.otherName}?`
          : 'Last chance to connect 🐾';
        const body = j.wave === '24h'
          ? 'They may connect with someone else soon.'
          : `Don't miss your PetSwap with ${j.otherName}.`;
        return {
          user_id: j.user_id,
          notification_type: 'match',
          title,
          body,
          deep_link: deepLinkFor(j.otherId),
          idempotency_key: `match_nudge_${j.wave}:${matchKey}:${j.user_id}`,
          source_event_id: matchKey,
          metadata: {
            type: 'match_nudge',
            subtype: j.wave,
            match_id: matchKey,
            other_user_id: j.otherId,
            conversation_id: conversationId ?? null,
          },
          status: 'queued' as const,
          scheduled_for: j.scheduled_for,
        };
      });

      // Upsert to avoid duplicates if notifyNewMatch is called twice.
      await supabase.from('pending_push_jobs')
        .upsert(rows, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });

      // CHAT → BOOKING NUDGE — fires +24h after match. Drainer cancels at
      // send-time if a chat_booking already exists in the conversation.
      const bookingNudgeRows = [
        {
          user_id: userAId, otherId: userBId, otherName: b?.first_name ?? 'your match',
        },
        {
          user_id: userBId, otherId: userAId, otherName: a?.first_name ?? 'your match',
        },
      ].map((j) => ({
        user_id: j.user_id,
        notification_type: 'booking_confirmed',
        title: 'Ready to confirm your PetSwap?',
        body: `Lock in your dates with ${j.otherName} before they fill up.`,
        deep_link: deepLinkFor(j.otherId),
        idempotency_key: `chat_to_booking_24h:${matchKey}:${j.user_id}`,
        source_event_id: matchKey,
        metadata: {
          type: 'chat_to_booking_24h',
          match_id: matchKey,
          other_user_id: j.otherId,
          conversation_id: conversationId ?? null,
        },
        status: 'queued' as const,
        scheduled_for: at24,
      }));
      await supabase.from('pending_push_jobs')
        .upsert(bookingNudgeRows, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
    })();

    void (async () => {
      const { sendPush } = await import('@/lib/sendPush');

      if (aLive && bLive) {
        // Record orchestration intent BEFORE firing push so the fallback
        // worker can take over if the push isn't opened in 2h.
        void recordCommEvent({
          userId: userAId,
          eventType: 'match_created',
          sourceEventId: matchKey,
          primaryChannel: 'push',
          fallbackChannel: 'email',
          fallbackAfterMinutes: 120,
          metadata: {
            otherFirstName: b?.first_name ?? null,
            otherAvatarUrl: b?.avatar_url ?? null,
            chatUrl: chatA,
            conversation_id: conversationId ?? null,
          },
        });
        void recordCommEvent({
          userId: userBId,
          eventType: 'match_created',
          sourceEventId: matchKey,
          primaryChannel: 'push',
          fallbackChannel: 'email',
          fallbackAfterMinutes: 120,
          metadata: {
            otherFirstName: a?.first_name ?? null,
            otherAvatarUrl: a?.avatar_url ?? null,
            chatUrl: chatB,
            conversation_id: conversationId ?? null,
          },
        });

        void sendPush({
          userId: userAId,
          type: 'match',
          title: "You've got a great match 👀",
          body: `${b?.first_name ?? 'Someone'} is ready to chat. Most swaps start today.`,
          deepLink: deepLinkFor(userBId),
          idempotencyKey: `new_match:${matchKey}:${userAId}`,
          sourceEventId: matchKey,
          metadata: {
            type: 'new_match',
            match_id: matchKey,
            other_user_id: userBId,
            conversation_id: conversationId ?? null,
            comm_event_type: 'match_created',
          },
        });
        void sendPush({
          userId: userBId,
          type: 'match',
          title: "You've got a great match 👀",
          body: `${a?.first_name ?? 'Someone'} is ready to chat. Most swaps start today.`,
          deepLink: deepLinkFor(userAId),
          idempotencyKey: `new_match:${matchKey}:${userBId}`,
          sourceEventId: matchKey,
          metadata: {
            type: 'new_match',
            match_id: matchKey,
            other_user_id: userAId,
            conversation_id: conversationId ?? null,
            comm_event_type: 'match_created',
          },
        });
      }
    })();
  } catch (err) {
    console.error('[notifyNewMatch] failed', err);
  }
}
