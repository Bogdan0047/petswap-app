// Public email tracking endpoint — no JWT required.
//
// Routes:
//   GET /email-track/o/:eventId.gif        → 1x1 pixel, marks opened_at
//   GET /email-track/c/:eventId/:cta?to=URL → 302 redirect, marks clicked_at + clicked_cta
//   POST /email-track/conv/:eventId/:cta   → marks converted=true (called from app after action)
//
// CTA names: open_chat, view_profile, confirm_booking, leave_review, ...

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SAFE_REDIRECT_HOSTS = new Set([
  'petswap.co.uk',
  'www.petswap.co.uk',
  'buddy-buddies-share.lovable.app',
])
const FALLBACK_URL = 'https://petswap.co.uk'

function safeRedirect(raw: string | null): string {
  if (!raw) return FALLBACK_URL
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return FALLBACK_URL
    if (!SAFE_REDIRECT_HOSTS.has(u.host)) return FALLBACK_URL
    return u.toString()
  } catch {
    return FALLBACK_URL
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const url = new URL(req.url)
  // Path looks like /email-track/o/<id>.gif — strip leading /email-track if present
  const parts = url.pathname.split('/').filter(Boolean)
  const fnIdx = parts.indexOf('email-track')
  const segs = fnIdx >= 0 ? parts.slice(fnIdx + 1) : parts
  const [kind, idRaw, ctaRaw] = segs

  // ── Open pixel ──────────────────────────────────────────
  if (kind === 'o' && idRaw) {
    const eventId = idRaw.replace(/\.gif$/i, '')
    if (UUID_RE.test(eventId)) {
      // Only set opened_at if not already set
      await supabase
        .from('email_events')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', eventId)
        .is('opened_at', null)
    }
    return new Response(PIXEL, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
      },
    })
  }

  // ── Click redirect ──────────────────────────────────────
  if (kind === 'c' && idRaw && ctaRaw) {
    let dest = safeRedirect(url.searchParams.get('to'))
    if (UUID_RE.test(idRaw)) {
      await supabase
        .from('email_events')
        .update({
          clicked_at: new Date().toISOString(),
          clicked_cta: ctaRaw.slice(0, 64),
        })
        .eq('id', idRaw)
        .is('clicked_at', null)
      // Append ?e=<eventId>&cta=<ctaRaw> so the app can record conversion.
      try {
        const d = new URL(dest)
        d.searchParams.set('e', idRaw)
        d.searchParams.set('cta', ctaRaw.slice(0, 64))
        dest = d.toString()
      } catch {
        // fall back to original dest
      }
    }
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: dest, 'Cache-Control': 'no-store' },
    })
  }

  // ── Conversion ping (called from app) ───────────────────
  if (kind === 'conv' && idRaw) {
    if (!UUID_RE.test(idRaw)) {
      return json({ error: 'invalid id' }, 400)
    }
    const cta = ctaRaw ? ctaRaw.slice(0, 64) : null
    // Map CTA → conversion bucket for A/B reporting
    const conversionType =
      cta === 'open_chat' ? 'chat' :
      cta === 'confirm_booking' ? 'booking' :
      cta === 'leave_review' ? 'review' :
      cta === 'view_profile' ? 'profile' :
      cta || 'other'
    const update: Record<string, unknown> = {
      converted: true,
      converted_at: new Date().toISOString(),
      conversion_type: conversionType,
    }
    if (cta) update.clicked_cta = cta
    await supabase
      .from('email_events')
      .update(update)
      .eq('id', idRaw)
      .eq('converted', false)
    return json({ ok: true }, 200)
  }

  return json({ error: 'not found' }, 404)
})

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
