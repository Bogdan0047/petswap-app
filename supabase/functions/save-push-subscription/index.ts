// Save or remove a Web Push subscription for the authenticated user.
// Body: { endpoint, p256dh, auth, user_agent?, platform? }
//   or  { endpoint, remove: true } to invalidate.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('authorization') || '';

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const endpoint = String(body.endpoint || '');
  if (!endpoint) return json({ error: 'endpoint required' }, 400);

  const admin = createClient(url, service);

  if (body.remove === true) {
    await admin.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
    return json({ ok: true, removed: true });
  }

  const p256dh = String(body.p256dh || '');
  const authKey = String(body.auth || '');
  if (!p256dh || !authKey) return json({ error: 'p256dh and auth required' }, 400);

  const { error } = await admin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: typeof body.user_agent === 'string' ? body.user_agent : null,
      platform: typeof body.platform === 'string' ? body.platform : null,
      is_valid: true,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
