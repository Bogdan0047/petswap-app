// Sends review-request push notifications for completed bookings.
//
// Two waves per booking, per user (max 2 pushes total):
//   1. First push: 12–24h after booking was completed
//   2. Reminder:   ~72h after completion, only if no review submitted
//
// Skips users who:
//   - already submitted a review for this swap
//   - are deleted / not active
//   - already received that wave (idempotency_key dedupe)
//
// Idempotency keys:
//   review_request:{bookingId}:{userId}
//   review_request_reminder:{bookingId}:{userId}
//
// Designed to run on a 15-minute cron. Stateless and idempotent.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOUR = 60 * 60 * 1000;
const FIRST_MIN_AGE = 12 * HOUR;     // earliest first-push age
const FIRST_MAX_AGE = 25 * HOUR;     // catch up to 25h to allow cron drift
const REMINDER_MIN_AGE = 72 * HOUR;  // 3 days
const REMINDER_MAX_AGE = 96 * HOUR;  // 4 days catch-up window
const MAX_BOOKINGS_PER_RUN = 200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  const now = Date.now();

  // A booking is "completed at" min(owner_confirm, helper_confirm) being the
  // later of the two — i.e. the moment status flipped to completed.
  // For querying we use updated_at as a reasonable proxy (mark_chat_booking_completed
  // touches updated_at). We then filter precisely in JS.
  const lookbackFrom = new Date(now - REMINDER_MAX_AGE).toISOString();

  const { data: bookings, error } = await admin
    .from('chat_bookings')
    .select('id, owner_id, helper_id, swap_id, completed_by_owner_at, completed_by_helper_at, updated_at, status')
    .eq('status', 'completed')
    .gte('updated_at', lookbackFrom)
    .limit(MAX_BOOKINGS_PER_RUN);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let firstSent = 0, remindersSent = 0, skipped = 0;

  for (const b of bookings ?? []) {
    // Determine completion timestamp = the later of the two confirm timestamps.
    const ts = [b.completed_by_owner_at, b.completed_by_helper_at]
      .filter(Boolean)
      .map((t) => new Date(t as string).getTime());
    if (ts.length === 0) { skipped++; continue; }
    const completedAt = Math.max(...ts);
    const age = now - completedAt;

    const wave: 'first' | 'reminder' | null =
      age >= FIRST_MIN_AGE && age < FIRST_MAX_AGE ? 'first'
      : age >= REMINDER_MIN_AGE && age < REMINDER_MAX_AGE ? 'reminder'
      : null;
    if (!wave) { skipped++; continue; }

    for (const userId of [b.owner_id, b.helper_id]) {
      if (!userId) continue;
      const otherId = userId === b.owner_id ? b.helper_id : b.owner_id;

      // Skip if this user has already reviewed this swap.
      if (b.swap_id) {
        const { data: existingReview } = await admin
          .from('reviews')
          .select('id')
          .eq('swap_id', b.swap_id)
          .eq('reviewer_id', userId)
          .maybeSingle();
        if (existingReview) { skipped++; continue; }
      }

      // Skip if recipient or other user is not active.
      const { data: profs } = await admin
        .from('profiles')
        .select('id, first_name, account_status, deleted_at')
        .in('id', [userId, otherId]);
      const me = profs?.find((p) => p.id === userId);
      const other = profs?.find((p) => p.id === otherId);
      if (!me || me.account_status !== 'active' || me.deleted_at) { skipped++; continue; }
      if (!other || other.account_status !== 'active' || other.deleted_at) { skipped++; continue; }

      const otherName = other.first_name || 'your match';
      const idem = wave === 'first'
        ? `review_request:${b.id}:${userId}`
        : `review_request_reminder:${b.id}:${userId}`;

      // Skip if we already sent (or attempted) this exact notification.
      const { data: existingEvent } = await admin
        .from('notification_events')
        .select('id')
        .eq('user_id', userId)
        .eq('idempotency_key', idem)
        .maybeSingle();
      if (existingEvent) { skipped++; continue; }

      const title = wave === 'first'
        ? 'How was your PetSwap? ⭐'
        : "Don't forget your review 👀";
      const body = wave === 'first'
        ? `Reviews help you get more matches next time. Users with reviews get 3× more responses.`
        : `${otherName} is waiting for your feedback — it only takes 30 seconds.`;

      const { data, error: invokeErr } = await admin.functions.invoke('send-push', {
        body: {
          user_id: userId,
          type: 'review_request',
          title,
          body,
          deep_link: `/reviews/${b.id}`,
          idempotency_key: idem,
          source_event_id: b.id,
          metadata: {
            type: 'review_request',
            wave,
            booking_id: b.id,
            swap_id: b.swap_id,
            other_user_id: otherId,
          },
          local_hour: new Date().getHours(),
        },
      });

      if (invokeErr) { skipped++; continue; }
      const status = (data as { status?: string } | null)?.status;
      if (status === 'sent' || status === 'queued') {
        if (wave === 'first') firstSent++;
        else remindersSent++;
      } else {
        skipped++;
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    checked: bookings?.length ?? 0,
    first_sent: firstSent,
    reminders_sent: remindersSent,
    skipped,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
