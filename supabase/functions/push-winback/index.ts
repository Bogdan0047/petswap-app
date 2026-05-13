// Re-engagement (winback) push notifications.
//
// Two waves per inactive user (max 2 per cycle):
//   1. winback_7d  — user inactive for 7+ days (and < 14 days)
//   2. winback_14d — user inactive for 14+ days (and < 28 days)
//
// Plus a "smart boost" wave:
//   3. winback_boost_24h — fired ~24h after a previous winback push was
//      CLICKED but the user is still inactive (no login since the click).
//
// Skips users who:
//   - did not complete onboarding
//   - account_status != 'active'
//   - are demo accounts
//   - have notification_preferences.marketing = false (or missing prefs)
//   - became active again
//   - already received that wave (idempotency_key dedupe via notification_events)
//
// Idempotency keys:
//   winback_7d:{userId}
//   winback_14d:{userId}
//   winback_boost_24h:{userId}:{sourceEventId}
//
// Designed to run daily. Stateless and idempotent. Pushes are enqueued through
// pending_push_jobs so the existing drain pipeline + quiet-hours gate apply.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MAX_USERS_PER_RUN = 500;

const COPY = {
  '7d': {
    title: 'Your next PetSwap is waiting 🐾',
    body: 'New pet owners are looking for swaps near you.',
  },
  '14d': {
    title: "Don't miss your next PetSwap",
    body: 'Come back and find trusted pet care today.',
  },
  'boost_24h': {
    title: 'Still looking for a PetSwap?',
    body: 'New matches are waiting for you.',
  },
};

const DEEP_LINK = '/home';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  const now = Date.now();
  const cutoff7 = new Date(now - 7 * DAY).toISOString();
  const cutoff14From = new Date(now - 28 * DAY).toISOString();
  const cutoff14To = new Date(now - 14 * DAY).toISOString();
  const cutoff7From = new Date(now - 14 * DAY).toISOString();

  let queued7 = 0, queued14 = 0, queuedBoost = 0, skipped = 0;

  // --- Wave 1: 7-day winback (inactive 7-14d window) ---
  const { data: users7 } = await admin
    .from('profiles')
    .select('id, last_active_at, onboarding_completed, account_status, is_demo')
    .eq('account_status', 'active')
    .eq('is_demo', false)
    .eq('onboarding_completed', true)
    .lte('last_active_at', cutoff7)
    .gt('last_active_at', cutoff7From)
    .limit(MAX_USERS_PER_RUN);

  for (const u of users7 ?? []) {
    if (await enqueueWinback(admin, u.id, '7d', now)) queued7++;
    else skipped++;
  }

  // --- Wave 2: 14-day winback (inactive 14-28d window) ---
  const { data: users14 } = await admin
    .from('profiles')
    .select('id, last_active_at, onboarding_completed, account_status, is_demo')
    .eq('account_status', 'active')
    .eq('is_demo', false)
    .eq('onboarding_completed', true)
    .lte('last_active_at', cutoff14To)
    .gt('last_active_at', cutoff14From)
    .limit(MAX_USERS_PER_RUN);

  for (const u of users14 ?? []) {
    if (await enqueueWinback(admin, u.id, '14d', now)) queued14++;
    else skipped++;
  }

  // --- Wave 3: smart 24h boost ---
  // Find winback events that were clicked >=24h ago but the user is still
  // inactive (last_active_at <= clicked_at). One boost per source event.
  const boostFrom = new Date(now - 7 * DAY).toISOString();
  const boostTo = new Date(now - 24 * HOUR).toISOString();
  const { data: clicked } = await admin
    .from('notification_events')
    .select('id, user_id, clicked_at, idempotency_key')
    .like('idempotency_key', 'winback_%')
    .not('clicked_at', 'is', null)
    .gte('clicked_at', boostFrom)
    .lte('clicked_at', boostTo)
    .limit(MAX_USERS_PER_RUN);

  for (const ev of clicked ?? []) {
    // Confirm user has not become active since the click.
    const { data: prof } = await admin
      .from('profiles')
      .select('id, last_active_at, account_status, is_demo, onboarding_completed')
      .eq('id', ev.user_id)
      .maybeSingle();
    if (!prof || prof.account_status !== 'active' || prof.is_demo || !prof.onboarding_completed) {
      skipped++; continue;
    }
    if (prof.last_active_at && new Date(prof.last_active_at).getTime() > new Date(ev.clicked_at!).getTime()) {
      skipped++; continue;
    }
    const boostKey = `winback_boost_24h:${ev.user_id}:${ev.id}`;
    if (await enqueueIfNew(admin, ev.user_id, boostKey, COPY.boost_24h, { source_event_id: ev.id })) {
      queuedBoost++;
    } else {
      skipped++;
    }
  }

  return new Response(JSON.stringify({
    ok: true, queued_7d: queued7, queued_14d: queued14, queued_boost: queuedBoost, skipped,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

async function enqueueWinback(
  admin: ReturnType<typeof createClient>,
  userId: string,
  wave: '7d' | '14d',
  _now: number,
): Promise<boolean> {
  const idem = `winback_${wave}:${userId}`;
  const copy = COPY[wave];
  return enqueueIfNew(admin, userId, idem, copy, { wave });
}

async function enqueueIfNew(
  admin: ReturnType<typeof createClient>,
  userId: string,
  idempotencyKey: string,
  copy: { title: string; body: string },
  metaExtra: Record<string, unknown>,
): Promise<boolean> {
  // Respect marketing preference at queue time (also re-checked by send-push gate).
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('marketing')
    .eq('user_id', userId)
    .maybeSingle();
  if (!prefs || prefs.marketing !== true) return false;

  // Dedupe via notification_events (covers both queued + sent + skipped).
  const { data: prior } = await admin
    .from('notification_events')
    .select('id')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .limit(1)
    .maybeSingle();
  if (prior?.id) return false;

  // Cancel-before-send: skip if user has any conversation message in last 7d
  // (i.e. already engaging again).
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const { count: recentMsg } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', userId)
    .gte('created_at', since);
  if ((recentMsg ?? 0) > 0) return false;

  const { error } = await admin.from('pending_push_jobs').insert({
    user_id: userId,
    notification_type: 'marketing',
    title: copy.title,
    body: copy.body,
    deep_link: DEEP_LINK,
    idempotency_key: idempotencyKey,
    scheduled_for: new Date().toISOString(),
    metadata: { ...metaExtra, deep_link_fallback: '/home' },
  });
  return !error;
}
