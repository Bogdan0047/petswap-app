// Returns the VAPID public key so the client can subscribe.
// Public-info only — no JWT required.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
