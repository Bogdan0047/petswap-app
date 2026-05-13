// Track open / click on a push notification event.
// Body: { event_id: uuid, kind: 'open' | 'click' }
// Does not require auth — the event_id is itself a capability token.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const eventId = typeof body.event_id === 'string' ? body.event_id : '';
  const kind = body.kind === 'click' ? 'click' : 'open';
  if (!eventId) return json({ error: 'event_id required' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  const patch: Record<string, string> = {};
  if (kind === 'click') {
    patch.clicked_at = new Date().toISOString();
    // A click implies an open if not already recorded.
    patch.opened_at = patch.opened_at ?? new Date().toISOString();
  } else {
    patch.opened_at = new Date().toISOString();
  }

  // Only update if not already set (prevent overwrite churn).
  const { data: existing } = await admin
    .from('notification_events')
    .select('id, opened_at, clicked_at')
    .eq('id', eventId)
    .maybeSingle();

  if (!existing) return json({ ok: false, reason: 'unknown_event' }, 200);

  const updates: Record<string, string> = {};
  if (kind === 'click' && !existing.clicked_at) updates.clicked_at = new Date().toISOString();
  if (!existing.opened_at) updates.opened_at = new Date().toISOString();

  if (Object.keys(updates).length > 0) {
    await admin.from('notification_events').update(updates).eq('id', eventId);
  }

  return json({ ok: true });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
