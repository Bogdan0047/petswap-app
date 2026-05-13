// Master PetSwap email send function.
// - Looks up the user, checks preferences, picks the right template
// - Delegates rendering + queueing to send-transactional-email
// - Logs every attempt to email_events
//
// Inputs:
//   { user_id, email_type, template_data?, force_transactional? }
//
// email_type values:
//   welcome, profile-incomplete, no-pet-added, trust-booster,
//   new-match, booking-confirmation, account-verified, review-request,
//   account-deletion-scheduled, inactive-winback, test-delivery
//
// Returns 200 with { success, event_id, skipped?, reason? } or 4xx/5xx with { error }.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Maps email_type -> which preference flag controls it.
// 'transactional' = always sent (subject to transactional_enabled)
// 'marketing' = only sent when marketing_enabled = true
const TYPE_CATEGORY: Record<string, { pref: keyof Prefs | null; category: 'critical' | 'optional' | 'marketing' }> = {
  // Critical transactional — always send unless transactional_enabled=false
  'welcome': { pref: null, category: 'critical' },
  'account-verified': { pref: null, category: 'critical' },
  'account-deletion-scheduled': { pref: null, category: 'critical' },
  'test-delivery': { pref: null, category: 'critical' },
  'subscription-active': { pref: null, category: 'critical' },
  'subscription-confirmation': { pref: null, category: 'critical' },
  'subscription-receipt': { pref: null, category: 'critical' },
  'subscription-welcome': { pref: null, category: 'critical' },
  'subscription-cancelled': { pref: null, category: 'critical' },
  // Optional categories — respect specific flag
  'new-match': { pref: 'match_notifications', category: 'optional' },
  'booking-confirmation': { pref: 'booking_notifications', category: 'optional' },
  'review-request': { pref: 'review_notifications', category: 'optional' },
  'profile-incomplete': { pref: 'trust_tips_enabled', category: 'optional' },
  'no-pet-added': { pref: 'trust_tips_enabled', category: 'optional' },
  'trust-booster': { pref: 'trust_tips_enabled', category: 'optional' },
  // Behavioural follow-ups — gated by the same prefs as the parent flow
  'match-nudge-24h': { pref: 'match_notifications', category: 'optional' },
  'match-nudge-72h': { pref: 'match_notifications', category: 'optional' },
  'review-reminder-3d': { pref: 'review_notifications', category: 'optional' },
  // Marketing — opt-in
  'inactive-winback': { pref: 'marketing_enabled', category: 'marketing' },
  'reengagement': { pref: 'marketing_enabled', category: 'marketing' },
}

interface Prefs {
  transactional_enabled: boolean
  marketing_enabled: boolean
  match_notifications: boolean
  booking_notifications: boolean
  review_notifications: boolean
  trust_tips_enabled: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Capture caller's JWT to forward to send-transactional-email (which verifies JWT).
  const callerAuth = req.headers.get('authorization') || ''

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const userId: string | undefined = body.user_id
  const emailType: string | undefined = body.email_type
  const templateData: Record<string, unknown> = body.template_data || {}
  const force: boolean = !!body.force_transactional
  const idempotencyKeyOverride: string | undefined = body.idempotency_key
  // Optional dedupe key — when present, dedupes per (user, emailType, dedupeKey).
  // E.g. dedupeKey = 'conn-<connection_id>' → one match email per user per connection.
  const dedupeKey: string | undefined = body.dedupe_key

  if (!userId || !emailType) return json({ error: 'user_id and email_type are required' }, 400)

  const config = TYPE_CATEGORY[emailType]
  if (!config) return json({ error: `Unknown email_type: ${emailType}` }, 400)

  // Authorization gate: only the target user, an admin, or a service-role caller
  // may trigger emails. Service-role is detected by attempting auth.getUser() with
  // the caller's token via the anon client — if it returns null AND the token is the
  // service key, it's an internal call.
  const supabaseAnonKeyCheck = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const callerToken = (callerAuth || '').replace('Bearer ', '')
  const isServiceRole = !!callerToken && callerToken === supabaseServiceKey
  if (!isServiceRole) {
    const callerClient = createClient(supabaseUrl, supabaseAnonKeyCheck, {
      global: { headers: { Authorization: callerAuth } },
    })
    const { data: userData } = await callerClient.auth.getUser(callerToken)
    const caller = userData?.user
    if (!caller) return json({ error: 'Unauthorized' }, 401)
    if (caller.id !== userId) {
      const { data: roleRow } = await supabase
        .from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin').maybeSingle()
      if (!roleRow) return json({ error: 'Forbidden' }, 403)
    }
  }

  // Look up user
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, first_name, profile_completion_pct')
    .eq('id', userId)
    .maybeSingle()

  if (pErr || !profile) {
    console.error('[send-petswap-email] user not found', { userId, pErr })
    return json({ error: 'User not found' }, 404)
  }
  if (!profile.email) return json({ error: 'User has no email' }, 400)

  // Look up preferences (auto-create if missing)
  let { data: prefs } = await supabase
    .from('email_preferences')
    .select('transactional_enabled, marketing_enabled, match_notifications, booking_notifications, review_notifications, trust_tips_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (!prefs) {
    await supabase.from('email_preferences').insert({ user_id: userId }).select().maybeSingle()
    prefs = {
      transactional_enabled: true,
      marketing_enabled: false,
      match_notifications: true,
      booking_notifications: true,
      review_notifications: true,
      trust_tips_enabled: true,
    }
  }

  // Preference gate
  if (!force) {
    if (config.category === 'marketing' && !prefs.marketing_enabled) {
      return await logSkipped(supabase, userId, emailType, profile.email, 'marketing_disabled')
    }
    if (config.category === 'optional' && config.pref && !prefs[config.pref]) {
      return await logSkipped(supabase, userId, emailType, profile.email, `pref_${config.pref}_disabled`)
    }
    if (config.category === 'critical' && !prefs.transactional_enabled) {
      // Transactional being off shouldn't actually block deletion/verify/welcome.
      // We log + send anyway because these are critical account emails.
      console.warn('[send-petswap-email] transactional disabled but sending critical', { userId, emailType })
    }
  }

  // Server-side dedupe.
  // - ONE_TIME_TYPES: one ever per user (e.g. welcome, account-verified)
  // - dedupe_key supplied: one per (user, emailType, dedupeKey) — used by
  //   match emails so each connection produces exactly one email per user.
  // 'account-verified' is no longer one-time globally — callers pass
  // dedupe_key (e.g. 'id', 'phone', 'profile') so each verification type
  // produces exactly one email per user.
  const ONE_TIME_TYPES = new Set(['welcome'])
  const isOneTime = ONE_TIME_TYPES.has(emailType)
  const automationKey = dedupeKey ? `${emailType}:${dedupeKey}` : emailType
  const shouldDedupe = !force && (isOneTime || !!dedupeKey)
  if (shouldDedupe) {
    const { data: prior } = await supabase
      .from('email_automation_log')
      .select('id, sent_at')
      .eq('user_id', userId)
      .eq('automation_type', automationKey)
      .limit(1)
      .maybeSingle()
    if (prior) {
      console.log('[send-petswap-email] dedupe skip', { emailType, userId, automationKey, priorSentAt: prior.sent_at })
      return await logSkipped(supabase, userId, emailType, profile.email, 'already_sent_once')
    }
  }

  // ── A/B variant assignment ────────────────────────────────────────────────
  // Deterministic per (user_id, email_type): same user always gets the same
  // variant for the same email type (no mid-flow flipping). If a winner is
  // declared we always use it. If the experiment is disabled or missing,
  // we send the default template (no overrides) and don't tag a variant.
  let variant: 'A' | 'B' | null = null
  let variantOverrides: Record<string, unknown> = {}
  try {
    const { data: ab } = await supabase
      .from('email_ab_config')
      .select('enabled, variant_a, variant_b, winner')
      .eq('email_type', emailType)
      .maybeSingle()
    if (ab && ab.enabled) {
      if (ab.winner === 'A' || ab.winner === 'B') {
        variant = ab.winner
      } else {
        variant = (await deterministicBucket(userId, emailType)) ? 'B' : 'A'
      }
      variantOverrides =
        (variant === 'A' ? (ab.variant_a as Record<string, unknown>) : (ab.variant_b as Record<string, unknown>)) || {}
    }
  } catch (e) {
    console.warn('[send-petswap-email] ab lookup failed', e)
  }

  // Insert pending event
  const idempotencyKey = idempotencyKeyOverride || `${emailType}-${userId}-${Date.now()}`
  const { data: event } = await supabase
    .from('email_events')
    .insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: profile.email,
      status: 'pending',
      variant,
      metadata: { idempotency_key: idempotencyKey, template_data: templateData, variant },
    })
    .select('id')
    .single()

  // Merge first_name + tracking metadata + variant overrides into template data.
  // Templates use `__eventId` and `__trackBase` to build pixel + click-redirect URLs.
  // Variant overrides (subjectOverride, ctaTextOverride, etc.) are read by templates
  // and the send-transactional-email subject resolver.
  const trackBase = `${supabaseUrl}/functions/v1/email-track`
  const mergedData = {
    firstName: profile.first_name,
    __eventId: event?.id,
    __trackBase: trackBase,
    __variant: variant,
    ...variantOverrides,
    ...templateData,
  }

  // Forward the original caller's Authorization header so send-transactional-email's
  // JWT verification passes. Falls back to anon key if absent (e.g., automation cron).
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = callerAuth || `Bearer ${supabaseAnonKey}`
  const invokeRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      templateName: emailType,
      recipientEmail: profile.email,
      idempotencyKey,
      templateData: mergedData,
    }),
  })

  let respJson: any = null
  try { respJson = await invokeRes.json() } catch {}
  const invokeOk = invokeRes.ok && !respJson?.error
  const invokeErr: { message?: string } | null = invokeOk
    ? null
    : { message: respJson?.error || `HTTP ${invokeRes.status}` }

  if (!invokeOk) {
    const errMsg = respJson?.error || invokeErr?.message || `HTTP ${invokeRes.status}`
    console.error('[send-petswap-email] provider failed', { emailType, userId, errMsg, respJson, invokeErr })
    if (event) {
      await supabase.from('email_events')
        .update({ status: 'failed', error_message: errMsg, metadata: { ...(respJson || {}), idempotency_key: idempotencyKey } })
        .eq('id', event.id)
    }
    return json({ success: false, error: errMsg, event_id: event?.id, response: respJson }, 500)
  }

  // Mark sent (final delivery is async via queue, but we've successfully queued)
  if (event) {
    await supabase.from('email_events')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { idempotency_key: idempotencyKey, queued: true, ...(respJson || {}) },
      })
      .eq('id', event.id)
  }

  // Record in automation log for dedupe (one-time and per-key)
  if (shouldDedupe) {
    await supabase.from('email_automation_log').insert({
      user_id: userId,
      automation_type: automationKey,
    })
  }

  console.log('[send-petswap-email] queued', { emailType, userId, eventId: event?.id })
  return json({ success: true, event_id: event?.id, response: respJson }, 200)
})

async function logSkipped(supabase: any, userId: string, emailType: string, email: string, reason: string) {
  // Skipped sends are NOT failures — log them as 'skipped' so admin dashboards
  // and failure metrics aren't polluted by intentional dedupe / preference gates.
  const { data: event } = await supabase
    .from('email_events')
    .insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: email,
      status: 'skipped',
      error_message: `skipped: ${reason}`,
      metadata: { skipped: true, reason },
    })
    .select('id')
    .single()
  return json({ success: false, skipped: true, reason, event_id: event?.id }, 200)
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Deterministic A/B bucket: SHA-256(userId + ':' + emailType), first byte parity.
// Same input -> same output (no mid-flow flipping). Returns true for B, false for A.
async function deterministicBucket(userId: string, emailType: string): Promise<boolean> {
  const buf = new TextEncoder().encode(`${userId}:${emailType}`)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const firstByte = new Uint8Array(hash)[0]
  return (firstByte & 1) === 1
}
