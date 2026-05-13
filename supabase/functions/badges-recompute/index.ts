// Daily badge recompute + earn-push.
// Iterates active profiles, calls recompute_user_badges() per user, and
// queues a one-time "you unlocked X" push for each newly-earned badge.
// Idempotent: badges are unique by (user_id, badge_type), and the push
// idempotency key is `badge_earned:<type>:<user>`.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BADGE_LABELS: Record<string, { title: string; body: string }> = {
  verified: {
    title: 'You unlocked Verified 🛡️',
    body: 'Your profile is now trusted by the community.',
  },
  fast_responder: {
    title: 'You unlocked Fast Responder ⚡',
    body: 'You reply quickly — owners love that.',
  },
  reliable: {
    title: 'You unlocked Reliable 💚',
    body: '3+ swaps with zero cancellations. Top tier.',
  },
  top_rated: {
    title: 'You unlocked Top Rated ⭐',
    body: 'Your reviews put you in the top tier.',
  },
  active_user: {
    title: 'You unlocked Active Member 🔥',
    body: 'A 3-day streak keeps you visible to more matches.',
  },
  consistent_user: {
    title: 'You unlocked Consistent 🔥',
    body: '3 days in a row — keep that streak going.',
  },
  trusted_user: {
    title: 'You unlocked Trusted User 🛡️',
    body: 'Your trust score puts you ahead of the pack.',
  },
  first_match: {
    title: 'First match unlocked 🎉',
    body: 'Say hi — most swaps start within an hour.',
  },
  first_booking: {
    title: 'First booking unlocked 🐾',
    body: 'Your first PetSwap is on the way.',
  },
  first_review: {
    title: 'First review unlocked ⭐',
    body: 'Reviews build trust — thank you.',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service);

  // Scan active, onboarded, non-demo profiles. Cap to keep cron predictable.
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id')
    .eq('account_status', 'active')
    .eq('is_demo', false)
    .eq('onboarding_completed', true)
    .limit(2000);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let scanned = 0, awarded = 0, pushed = 0, failed = 0;
  for (const p of profiles ?? []) {
    scanned++;
    try {
      const { data: newBadges, error: rpcErr } = await admin
        .rpc('recompute_user_badges', { _user_id: p.id });
      if (rpcErr) { failed++; continue; }

      // Drive the push for newly-earned types
      const arr = (newBadges ?? []) as string[] | { recompute_user_badges: string }[];
      const types: string[] = Array.isArray(arr)
        ? (typeof arr[0] === 'string'
            ? (arr as string[])
            : (arr as { recompute_user_badges: string }[]).map(r => r.recompute_user_badges))
        : [];

      for (const badgeType of types) {
        awarded++;
        const tpl = BADGE_LABELS[badgeType] ?? {
          title: 'You unlocked a new badge 🛡️',
          body: `You're now a ${badgeType.replace('_', ' ')} on PetSwap`,
        };
        try {
          const { data } = await admin.functions.invoke('send-push', {
            body: {
              user_id: p.id,
              type: 'verification', // critical-ish: always within prefs
              title: tpl.title,
              body: tpl.body,
              deep_link: '/profile',
              idempotency_key: `badge_earned:${badgeType}:${p.id}`,
              metadata: { type: 'badge_earned', badge_type: badgeType },
            },
          });
          if ((data as { status?: string })?.status === 'sent') pushed++;
        } catch (_e) { /* fail-safe */ }
      }
    } catch (_e) { failed++; }
  }

  return new Response(JSON.stringify({ ok: true, scanned, awarded, pushed, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
