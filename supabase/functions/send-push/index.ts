// Send a push notification to a single user (all of their valid subscriptions).
//
// Body:
//   {
//     user_id: uuid,
//     type: 'match' | 'message' | 'booking_confirmed' | 'booking_reminder' |
//           'review_request' | 'verification' | 'safety' | 'marketing' | 'test',
//     title: string,
//     body: string,
//     deep_link?: string,                 // e.g. '/inbox/<conv>'
//     idempotency_key?: string,           // dedupe per user
//     source_event_id?: string,           // domain id (booking id, conv id, ...)
//     metadata?: Record<string, unknown>,
//     local_hour?: number,                // 0..23 — recipient's local hour, optional
//     bypass_gate?: boolean,              // admin test sends only
//   }
//
// Returns 200 with { ok, status: 'sent'|'skipped'|'failed', reason?, event_id }.
//
// Verifies the caller's JWT and only allows:
//   - sending to self, OR
//   - service-role / admin caller (for system triggers + admin tools).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TYPES = new Set([
  'match', 'message', 'booking_confirmed', 'booking_reminder',
  'review_request', 'verification', 'safety', 'marketing', 'test',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidEmail = Deno.env.get('VAPID_CONTACT_EMAIL') ?? 'mailto:hello@petswap.co.uk';

  if (!vapidPub || !vapidPriv) return json({ error: 'VAPID keys not configured' }, 500);
  webpush.setVapidDetails(
    vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
    vapidPub,
    vapidPriv,
  );

  // Identify caller
  const authHeader = req.headers.get('authorization') || '';
  const isServiceRole = authHeader.includes(service);
  let callerId: string | null = null;
  let isAdminCaller = false;
  if (!isServiceRole) {
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await userClient.auth.getUser();
    callerId = ud.user?.id ?? null;
    if (callerId) {
      const admin = createClient(url, service);
      const { data: roles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId);
      isAdminCaller = (roles ?? []).some((r) => r.role === 'admin');
    }
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const userId = String(body.user_id || '');
  const type = String(body.type || '');
  const title = String(body.title || '').slice(0, 120);
  const bodyText = String(body.body || '').slice(0, 240);
  const deepLink = typeof body.deep_link === 'string' ? body.deep_link : null;
  const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key : null;
  const sourceEventId = typeof body.source_event_id === 'string' ? body.source_event_id : null;
  const metadata = (body.metadata && typeof body.metadata === 'object') ? body.metadata as Record<string, unknown> : {};
  const localHour = Number.isFinite(body.local_hour as number) ? Math.max(0, Math.min(23, Number(body.local_hour))) : new Date().getUTCHours();
  const bypassGate = body.bypass_gate === true;

  if (!userId || !type || !title || !bodyText) return json({ error: 'user_id, type, title, body required' }, 400);
  if (!ALLOWED_TYPES.has(type)) return json({ error: 'invalid type' }, 400);

  // Authorization: self, admin, or service-role
  if (!isServiceRole && !isAdminCaller && callerId !== userId) {
    return json({ error: 'Forbidden' }, 403);
  }

  const admin = createClient(url, service);

  // Insert pending event (with dedupe by idempotency_key)
  const insertRow = {
    user_id: userId,
    notification_type: type,
    title,
    body: bodyText,
    deep_link: deepLink,
    status: 'pending' as const,
    idempotency_key: idempotencyKey,
    source_event_id: sourceEventId,
    metadata,
  };

  let eventId: string | null = null;
  {
    const { data, error } = await admin
      .from('notification_events')
      .insert(insertRow)
      .select('id')
      .single();
    if (error) {
      // Unique violation on idempotency_key → already attempted
      if (String(error.code) === '23505' || /duplicate/i.test(error.message)) {
        const { data: existing } = await admin
          .from('notification_events')
          .select('id, status')
          .eq('user_id', userId)
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        return json({ ok: false, status: 'duplicate', event_id: existing?.id ?? null });
      }
      return json({ error: error.message }, 500);
    }
    eventId = data.id;
  }

  // Gate (skip for explicit bypass like test sends).
  if (!bypassGate) {
    const { data: skipReason } = await admin.rpc('should_send_push', {
      _user_id: userId,
      _type: type,
      _local_hour: localHour,
    });
    if (skipReason) {
      // Quiet hours → queue for later delivery instead of dropping.
      if (skipReason === 'quiet_hours') {
        // Best-effort enqueue; ignore unique-violation duplicates.
        await admin.from('pending_push_jobs').insert({
          user_id: userId,
          notification_type: type,
          title,
          body: bodyText,
          deep_link: deepLink,
          metadata,
          idempotency_key: idempotencyKey,
          source_event_id: sourceEventId,
          // Queue for next minute past quiet-end (drainer enforces final gate).
          scheduled_for: new Date().toISOString(),
        });
        await admin.from('notification_events')
          .update({ status: 'skipped', skip_reason: 'quiet_hours_queued' })
          .eq('id', eventId!);
        return json({ ok: false, status: 'queued', reason: 'quiet_hours', event_id: eventId });
      }
      await admin.from('notification_events').update({ status: 'skipped', skip_reason: skipReason }).eq('id', eventId!);
      return json({ ok: false, status: 'skipped', reason: skipReason, event_id: eventId });
    }
  }

  // Fetch valid subscriptions
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_valid', true);

  if (!subs || subs.length === 0) {
    await admin.from('notification_events').update({ status: 'skipped', skip_reason: 'no_subscription' }).eq('id', eventId!);
    return json({ ok: false, status: 'skipped', reason: 'no_subscription', event_id: eventId });
  }

  const payload = JSON.stringify({
    title,
    body: bodyText,
    url: deepLink ?? '/',
    eventId,
    type,
    tag: idempotencyKey ?? `${type}:${eventId}`,
    renotify: true,
  });

  let anyOk = false;
  let lastErr: string | null = null;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 24 },
      );
      anyOk = true;
      // Touch last_used_at
      await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', sub.id);
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      lastErr = err?.body || err?.message || String(e);
      // 404 / 410 → endpoint gone, mark invalid
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from('push_subscriptions').update({ is_valid: false }).eq('id', sub.id);
      }
    }
  }

  if (anyOk) {
    await admin.from('notification_events').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', eventId!);
    return json({ ok: true, status: 'sent', event_id: eventId });
  }

  await admin.from('notification_events').update({ status: 'failed', error_message: lastErr }).eq('id', eventId!);
  return json({ ok: false, status: 'failed', error: lastErr, event_id: eventId }, 500);
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
