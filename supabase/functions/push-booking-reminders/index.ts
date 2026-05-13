// Sends 24h-before push reminders for confirmed bookings.
// Run on a cron schedule (every 15 min). Idempotent via notification_events.idempotency_key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Find confirmed bookings starting in ~24h (window: 24h to 24h+15min from now)
  const now = Date.now();
  const from = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now + 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString();

  const { data: bookings, error } = await supabase
    .from('chat_bookings')
    .select('id, owner_id, helper_id, start_at, status, confirmed_by_owner_at, confirmed_by_helper_at')
    .eq('status', 'confirmed')
    .gte('start_at', from)
    .lt('start_at', to);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  for (const b of bookings ?? []) {
    for (const userId of [b.owner_id, b.helper_id]) {
      if (!userId) continue;
      const idem = `booking-reminder-24h:${b.id}:${userId}`;
      // Skip if already logged
      const { data: existing } = await supabase
        .from('notification_events')
        .select('id')
        .eq('idempotency_key', idem)
        .maybeSingle();
      if (existing) continue;

      const startsAt = new Date(b.start_at);
      const timeStr = startsAt.toLocaleString('en-GB', {
        weekday: 'short', hour: '2-digit', minute: '2-digit',
      });

      await supabase.functions.invoke('send-push', {
        body: {
          user_id: userId,
          type: 'booking_reminder',
          title: 'Booking tomorrow 🐾',
          body: `Your pet care booking is at ${timeStr}. Tap for details.`,
          deep_link: `/bookings/${b.id}`,
          idempotency_key: idem,
          source_event_id: b.id,
          local_hour: new Date().getHours(),
        },
      });
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: bookings?.length ?? 0, sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
