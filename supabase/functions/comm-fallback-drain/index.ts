// Cross-channel fallback worker.
//
// For every communication_events row where:
//   - primary_channel = 'push'
//   - fallback_channel = 'email'
//   - sent_push_at is older than fallback_after_minutes
//   - opened_push_at IS NULL
//   - converted = false
//   - fallback_dispatched_at IS NULL
//
// → invoke send-petswap-email with the appropriate email_type, then mark
//   fallback_dispatched_at so we never send twice.
//
// Designed for a 5-minute cron. Idempotent.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map communication event_type → backup email_type sent if push ignored.
const FALLBACK_EMAIL: Record<string, string> = {
  match_created: 'new-match',
  booking_confirmed: 'booking-confirmation',
  booking_completed: 'review-request',
  // message_sent, badge_earned, review_submitted: no email fallback by spec
};

const MAX_PER_RUN = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  // Pull candidate events.
  const { data: events, error } = await admin
    .from('communication_events')
    .select('*')
    .eq('primary_channel', 'push')
    .eq('fallback_channel', 'email')
    .eq('converted', false)
    .is('opened_push_at', null)
    .is('fallback_dispatched_at', null)
    .not('sent_push_at', 'is', null)
    .not('fallback_after_minutes', 'is', null)
    .order('sent_push_at', { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  const now = Date.now();
  let dispatched = 0, skipped = 0, failed = 0;

  for (const ev of events ?? []) {
    const sentAt = ev.sent_push_at ? new Date(ev.sent_push_at).getTime() : 0;
    const after = (ev.fallback_after_minutes ?? 0) * 60_000;
    if (sentAt + after > now) { skipped++; continue; }

    const emailType = FALLBACK_EMAIL[ev.event_type as string];
    if (!emailType) {
      // Mark as dispatched-skip so we don't keep scanning.
      await admin.from('communication_events').update({
        fallback_dispatched_at: new Date().toISOString(),
        metadata: { ...(ev.metadata ?? {}), fallback_skip: 'no_email_mapping' },
      }).eq('id', ev.id);
      skipped++;
      continue;
    }

    // Anti-spam: max 1 email per day per user.
    const { data: emailToday } = await admin.rpc('user_channel_count_today', {
      _user_id: ev.user_id, _channel: 'email',
    });
    if ((emailToday as number ?? 0) >= 1) {
      await admin.from('communication_events').update({
        fallback_dispatched_at: new Date().toISOString(),
        metadata: { ...(ev.metadata ?? {}), fallback_skip: 'email_cap_reached' },
      }).eq('id', ev.id);
      skipped++;
      continue;
    }

    // Dispatch the email — sendPetSwapEmail respects user prefs + dedupe.
    const { error: invErr } = await admin.functions.invoke('send-petswap-email', {
      body: {
        user_id: ev.user_id,
        email_type: emailType,
        template_data: ev.metadata ?? {},
        idempotency_key: `comm_fallback:${ev.id}`,
      },
    });

    if (invErr) {
      failed++;
      // Don't mark dispatched — let next run retry.
      continue;
    }

    await admin.from('communication_events').update({
      fallback_dispatched_at: new Date().toISOString(),
      sent_email_at: new Date().toISOString(),
    }).eq('id', ev.id);
    dispatched++;
  }

  return json({ ok: true, scanned: events?.length ?? 0, dispatched, skipped, failed });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
