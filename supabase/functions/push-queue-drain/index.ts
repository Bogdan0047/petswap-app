// Drains push notifications that were queued during quiet hours.
// Re-invokes send-push for each queued job; the gate decides whether to
// deliver (now out of quiet hours), keep skipping, or fail.
//
// Designed to run on a 5-minute cron. Stateless and idempotent — re-attempts
// of the same job collapse via the (user_id, idempotency_key) unique index
// on notification_events.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PER_RUN = 200;
const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  const { data: jobs, error } = await admin
    .from('pending_push_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let drained = 0, requeued = 0, failed = 0;

  for (const job of jobs ?? []) {
    // ----- CANCEL LOGIC for match-nudge pushes -----
    // Skip if any messages or bookings exist in the conversation by send-time.
    if (job.notification_type === 'match' && typeof job.idempotency_key === 'string'
        && job.idempotency_key.startsWith('match_nudge_')) {
      const meta = (job.metadata ?? {}) as { conversation_id?: string | null; other_user_id?: string | null };
      let convId: string | null = meta.conversation_id ?? null;

      // Resolve conversation if not stored on the job.
      if (!convId && meta.other_user_id) {
        const a = job.user_id < meta.other_user_id ? job.user_id : meta.other_user_id;
        const b = job.user_id < meta.other_user_id ? meta.other_user_id : job.user_id;
        const { data: c } = await admin.from('conversations')
          .select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
        convId = c?.id ?? null;
      }

      if (convId) {
        const { count: msgCount } = await admin.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        const { count: bookCount } = await admin.from('chat_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        if ((msgCount ?? 0) > 0 || (bookCount ?? 0) > 0) {
          // Cancel: log a skipped notification_event so we have an audit trail.
          await admin.from('notification_events').insert({
            user_id: job.user_id,
            notification_type: job.notification_type,
            title: job.title,
            body: job.body,
            deep_link: job.deep_link,
            status: 'skipped',
            skip_reason: (msgCount ?? 0) > 0 ? 'match_already_messaged' : 'match_already_booked',
            idempotency_key: job.idempotency_key,
            source_event_id: job.source_event_id,
            metadata: job.metadata ?? {},
          });
          await admin.from('pending_push_jobs').update({
            status: 'drained', attempts: (job.attempts ?? 0) + 1,
          }).eq('id', job.id);
          drained++;
          continue;
        }
      }
    }

    // ----- CANCEL LOGIC for booking "say hello" 6h follow-up -----
    // Skip if any message has been sent in the conversation by send-time.
    if (typeof job.idempotency_key === 'string'
        && job.idempotency_key.startsWith('booking_say_hello_')) {
      const meta = (job.metadata ?? {}) as { conversation_id?: string | null; booking_id?: string | null };
      let convId: string | null = meta.conversation_id ?? null;
      if (!convId && meta.booking_id) {
        const { data: bk } = await admin.from('chat_bookings')
          .select('conversation_id').eq('id', meta.booking_id).maybeSingle();
        convId = bk?.conversation_id ?? null;
      }
      if (convId) {
        const { count: msgCount } = await admin.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        if ((msgCount ?? 0) > 0) {
          await admin.from('notification_events').insert({
            user_id: job.user_id,
            notification_type: job.notification_type,
            title: job.title,
            body: job.body,
            deep_link: job.deep_link,
            status: 'skipped',
            skip_reason: 'booking_already_messaged',
            idempotency_key: job.idempotency_key,
            source_event_id: job.source_event_id,
            metadata: job.metadata ?? {},
          });
          await admin.from('pending_push_jobs').update({
            status: 'drained', attempts: (job.attempts ?? 0) + 1,
          }).eq('id', job.id);
          drained++;
          continue;
        }
      }
    }

    // ----- CANCEL LOGIC for chat → booking nudge (24h) AND 3-msg nudge (2h) -----
    // Skip if a booking already exists in the conversation by send-time.
    if (typeof job.idempotency_key === 'string'
        && (job.idempotency_key.startsWith('chat_to_booking_')
          || job.idempotency_key.startsWith('chat_3msg_nudge:'))) {
      const meta = (job.metadata ?? {}) as { conversation_id?: string | null; other_user_id?: string | null };
      let convId: string | null = meta.conversation_id ?? null;
      if (!convId && meta.other_user_id) {
        const a = job.user_id < meta.other_user_id ? job.user_id : meta.other_user_id;
        const b = job.user_id < meta.other_user_id ? meta.other_user_id : job.user_id;
        const { data: c } = await admin.from('conversations')
          .select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
        convId = c?.id ?? null;
      }
      if (convId) {
        const { count: bookCount } = await admin.from('chat_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        if ((bookCount ?? 0) > 0) {
          await admin.from('notification_events').insert({
            user_id: job.user_id,
            notification_type: job.notification_type,
            title: job.title,
            body: job.body,
            deep_link: job.deep_link,
            status: 'skipped',
            skip_reason: 'booking_already_exists',
            idempotency_key: job.idempotency_key,
            source_event_id: job.source_event_id,
            metadata: job.metadata ?? {},
          });
          await admin.from('pending_push_jobs').update({
            status: 'drained', attempts: (job.attempts ?? 0) + 1,
          }).eq('id', job.id);
          drained++;
          continue;
        }
      }
    }

    // ----- CANCEL LOGIC for "speed to action" 2h post-match push -----
    // Skip if any message has been exchanged in the conversation by send-time.
    if (typeof job.idempotency_key === 'string'
        && job.idempotency_key.startsWith('match_speed_2h:')) {
      const meta = (job.metadata ?? {}) as { conversation_id?: string | null; other_user_id?: string | null };
      let convId: string | null = meta.conversation_id ?? null;
      if (!convId && meta.other_user_id) {
        const a = job.user_id < meta.other_user_id ? job.user_id : meta.other_user_id;
        const b = job.user_id < meta.other_user_id ? meta.other_user_id : job.user_id;
        const { data: c } = await admin.from('conversations')
          .select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
        convId = c?.id ?? null;
      }
      if (convId) {
        const { count: msgCount } = await admin.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId);
        if ((msgCount ?? 0) > 0) {
          await admin.from('notification_events').insert({
            user_id: job.user_id,
            notification_type: job.notification_type,
            title: job.title,
            body: job.body,
            deep_link: job.deep_link,
            status: 'skipped',
            skip_reason: 'match_already_messaged',
            idempotency_key: job.idempotency_key,
            source_event_id: job.source_event_id,
            metadata: job.metadata ?? {},
          });
          await admin.from('pending_push_jobs').update({
            status: 'drained', attempts: (job.attempts ?? 0) + 1,
          }).eq('id', job.id);
          drained++;
          continue;
        }
      }
    }


    // Skip if the user became active again since the job was queued, or if
    // they've sent any message in the last 7 days.
    if (typeof job.idempotency_key === 'string' && job.idempotency_key.startsWith('winback_')) {
      const { data: prof } = await admin.from('profiles')
        .select('last_active_at, account_status, is_demo, onboarding_completed')
        .eq('id', job.user_id).maybeSingle();
      const queuedAt = new Date(job.created_at).getTime();
      const lastActive = prof?.last_active_at ? new Date(prof.last_active_at).getTime() : 0;
      let cancel: string | null = null;
      if (!prof || prof.account_status !== 'active') cancel = 'account_not_active';
      else if (prof.is_demo) cancel = 'demo_account';
      else if (!prof.onboarding_completed) cancel = 'onboarding_incomplete';
      else if (lastActive > queuedAt) cancel = 'user_became_active';
      if (!cancel) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: recentMsg } = await admin.from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', job.user_id).gte('created_at', since);
        if ((recentMsg ?? 0) > 0) cancel = 'user_already_engaging';
      }
      if (cancel) {
        await admin.from('notification_events').insert({
          user_id: job.user_id, notification_type: job.notification_type,
          title: job.title, body: job.body, deep_link: job.deep_link,
          status: 'skipped', skip_reason: cancel,
          idempotency_key: job.idempotency_key, source_event_id: job.source_event_id,
          metadata: job.metadata ?? {},
        });
        await admin.from('pending_push_jobs').update({
          status: 'drained', attempts: (job.attempts ?? 0) + 1,
        }).eq('id', job.id);
        drained++;
        continue;
      }
    }

    // Look up recipient's local hour for the gate.
    let localHour = new Date().getUTCHours();
    try {
      // Best-effort: assume server clock; should_send_push enforces final logic.
      localHour = new Date().getHours();
    } catch (_e) { /* noop */ }

    const { data, error: invokeErr } = await admin.functions.invoke('send-push', {
      body: {
        user_id: job.user_id,
        type: job.notification_type,
        title: job.title,
        body: job.body,
        deep_link: job.deep_link,
        idempotency_key: job.idempotency_key,
        source_event_id: job.source_event_id,
        metadata: job.metadata ?? {},
        local_hour: localHour,
      },
    });

    const status = (data as { status?: string } | null)?.status;
    const reason = (data as { reason?: string } | null)?.reason;

    if (invokeErr || status === 'failed') {
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await admin.from('pending_push_jobs').update({
          status: 'failed', attempts, last_error: invokeErr?.message ?? reason ?? 'unknown',
        }).eq('id', job.id);
        failed++;
      } else {
        await admin.from('pending_push_jobs').update({
          attempts, last_error: invokeErr?.message ?? reason ?? 'unknown',
          scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }).eq('id', job.id);
        requeued++;
      }
      continue;
    }

    if (status === 'queued' && reason === 'quiet_hours') {
      // Still in quiet hours → push schedule out 30 min.
      await admin.from('pending_push_jobs').update({
        attempts: (job.attempts ?? 0) + 1,
        scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }).eq('id', job.id);
      requeued++;
      continue;
    }

    // sent / skipped (other reason) / duplicate → mark drained.
    await admin.from('pending_push_jobs').update({
      status: 'drained', attempts: (job.attempts ?? 0) + 1,
    }).eq('id', job.id);
    drained++;
  }

  return new Response(JSON.stringify({ ok: true, picked: jobs?.length ?? 0, drained, requeued, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
