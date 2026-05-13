// Daily streak-keeper push.
// Runs hourly via cron. For users whose current local hour falls in 18–20
// AND who have NOT done a streak activity today (last_activity_date < today),
// queue a one-shot "don't break your streak" push. Idempotent per (user, day).
//
// Uses send-push so prefs, quiet hours, dedupe and the 3-per-day cap apply.
// Targets users with current_streak_days >= 1 only (no point if no streak).
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// We don't store user timezone — assume UTC and align cron to 18:00 UTC.
// In a future iteration we'd store tz on profile. The send-push gate also
// enforces the recipient's quiet-hours preference as a final guard.
const PUSH_LOCAL_HOUR = 19;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // Find users with a live streak who haven't been active today.
  const { data: streaks, error } = await admin
    .from('user_streaks')
    .select('user_id, current_streak_days, last_activity_date')
    .gte('current_streak_days', 1)
    .lt('last_activity_date', today)
    .limit(1000);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let scanned = 0, queued = 0, skipped = 0;
  for (const s of streaks ?? []) {
    scanned++;
    try {
      // Defence in depth: profile must be active + onboarded.
      const { data: prof } = await admin
        .from('profiles')
        .select('account_status, is_demo, onboarding_completed')
        .eq('id', s.user_id)
        .maybeSingle();
      if (!prof || prof.account_status !== 'active' || prof.is_demo || !prof.onboarding_completed) {
        skipped++; continue;
      }

      const { data } = await admin.functions.invoke('send-push', {
        body: {
          user_id: s.user_id,
          type: 'marketing', // rate-limited + quiet-hours respected
          title: "Don't break your streak 🔥",
          body: `You're on a ${s.current_streak_days}-day streak. Jump back in.`,
          deep_link: '/',
          idempotency_key: `streak_nudge:${s.user_id}:${today}`,
          metadata: { type: 'streak_nudge', streak: s.current_streak_days, day: today },
          local_hour: PUSH_LOCAL_HOUR,
        },
      });
      if ((data as { status?: string })?.status === 'sent') queued++;
      else skipped++;
    } catch (_e) { skipped++; }
  }

  return new Response(JSON.stringify({ ok: true, scanned, queued, skipped }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
