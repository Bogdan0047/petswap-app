// Behavioural email automation runner.
// Scheduled by pg_cron every 6 hours.
//
// For each user, checks signup age + activity + verification + pet/profile state
// and dispatches the right email via send-petswap-email.
// Uses email_automation_log to dedupe (windows: 7 days for reminders, 14 for inactive).
//
// Safe to invoke manually (admin) — same cooldowns apply.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COOLDOWNS_DAYS: Record<string, number> = {
  'profile-incomplete': 7,
  'no-pet-added': 7,
  'trust-booster': 7,
  'inactive-winback': 14,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Service-role only — cron passes the service key. Reject all other callers.
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token || token !== supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const stats = {
    scanned: 0,
    profile_incomplete: 0,
    no_pet_added: 0,
    trust_booster: 0,
    inactive: 0,
    scheduled_drained: 0,
    scheduled_failed: 0,
    errors: [] as string[],
  }

  // ── Drain due scheduled jobs (review-request etc.) ──
  try {
    const nowIso = new Date().toISOString()
    const { data: dueJobs } = await supabase
      .from('pending_email_jobs')
      .select('id, user_id, email_type, template_data, idempotency_key, attempts, dedupe_key')
      .eq('status', 'pending')
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(500)

    for (const job of dueJobs ?? []) {
      try {
        const tData = (job.template_data as Record<string, unknown>) || {}
        // Conversion-aware skip: if the user has already taken the action the
        // follow-up nudges toward, mark the job as cancelled and move on.
        const skipReason = await shouldSkipFollowUp(supabase, job.user_id, job.email_type, tData)
        if (skipReason) {
          await supabase.from('pending_email_jobs')
            .update({
              status: 'cancelled',
              last_error: `skipped: ${skipReason}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)
          stats.scheduled_drained++
          continue
        }

        const ok = await dispatchScheduled(
          supabaseUrl,
          supabaseServiceKey,
          job.user_id,
          job.email_type,
          tData,
          job.idempotency_key || `${job.email_type}-${job.id}`,
          job.dedupe_key || undefined,
        )
        if (ok) {
          await supabase.from('pending_email_jobs')
            .update({ status: 'sent', updated_at: new Date().toISOString() })
            .eq('id', job.id)
          stats.scheduled_drained++
        } else {
          const nextAttempts = (job.attempts ?? 0) + 1
          await supabase.from('pending_email_jobs')
            .update({
              status: nextAttempts >= 5 ? 'failed' : 'pending',
              attempts: nextAttempts,
              last_error: 'dispatch_failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id)
          stats.scheduled_failed++
        }
      } catch (e: any) {
        console.error('[automation] scheduled job error', job.id, e)
        await supabase.from('pending_email_jobs')
          .update({
            status: 'failed',
            attempts: (job.attempts ?? 0) + 1,
            last_error: e?.message || String(e),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        stats.scheduled_failed++
      }
    }
  } catch (e) {
    console.error('[automation] drain failed', e)
  }

  // Pull all active, non-demo users with email
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, profile_completion_pct, is_id_verified, last_active_at, created_at, account_status, is_demo')
    .eq('account_status', 'active')
    .eq('is_demo', false)
    .not('email', 'is', null)
    .limit(5000)

  if (error || !users) {
    console.error('[automation] profile fetch failed', error)
    return json({ error: 'profile fetch failed' }, 500)
  }

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  for (const u of users) {
    stats.scanned++
    try {
      const ageMs = now - new Date(u.created_at).getTime()
      const ageH = ageMs / (1000 * 60 * 60)
      const lastActiveMs = u.last_active_at ? now - new Date(u.last_active_at).getTime() : ageMs
      const lastActiveDays = lastActiveMs / dayMs

      // 24h+ since signup, profile < 70%
      if (ageH >= 24 && (u.profile_completion_pct ?? 0) < 70) {
        if (await canSend(supabase, u.id, 'profile-incomplete')) {
          await dispatch(supabaseUrl, supabaseServiceKey, u.id, 'profile-incomplete', {
            firstName: u.first_name,
            completionPct: u.profile_completion_pct ?? 0,
          })
          await logAutomation(supabase, u.id, 'profile-incomplete')
          stats.profile_incomplete++
        }
      }

      // 24h+ since signup, no pets
      if (ageH >= 24) {
        const { count: petCount } = await supabase
          .from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', u.id)
        if ((petCount ?? 0) === 0 && await canSend(supabase, u.id, 'no-pet-added')) {
          await dispatch(supabaseUrl, supabaseServiceKey, u.id, 'no-pet-added', { firstName: u.first_name })
          await logAutomation(supabase, u.id, 'no-pet-added')
          stats.no_pet_added++
        }
      }

      // 48h+, not ID verified
      if (ageH >= 48 && !u.is_id_verified) {
        if (await canSend(supabase, u.id, 'trust-booster')) {
          await dispatch(supabaseUrl, supabaseServiceKey, u.id, 'trust-booster', { firstName: u.first_name })
          await logAutomation(supabase, u.id, 'trust-booster')
          stats.trust_booster++
        }
      }

      // Re-engagement (inactive user) — first send at 7d, optional second at 14d.
      // Max 2 per inactivity cycle. Cycle resets when last_active_at moves forward
      // past the most recent send. Marketing-opt-in enforced in send-petswap-email.
      if (lastActiveDays >= 7 && ageH >= 7 * 24) {
        const lastActiveIso = u.last_active_at
          ? new Date(u.last_active_at).toISOString()
          : new Date(u.created_at).toISOString()

        // Count reengagement sends since the user was last active.
        const { data: priorSends } = await supabase
          .from('email_automation_log')
          .select('id, sent_at')
          .eq('user_id', u.id)
          .eq('automation_type', 'reengagement')
          .gt('sent_at', lastActiveIso)
          .order('sent_at', { ascending: false })

        const sendsThisCycle = priorSends?.length ?? 0
        const lastSendMs = priorSends?.[0]?.sent_at
          ? new Date(priorSends[0].sent_at).getTime()
          : 0
        const daysSinceLastSend = lastSendMs ? (now - lastSendMs) / dayMs : Infinity

        // Send #1 at 7d. Send #2 only if still inactive AND ≥7 days since send #1
        // (so it lands around the 14-day mark) AND we haven't already sent twice.
        const shouldSend =
          (sendsThisCycle === 0 && lastActiveDays >= 7) ||
          (sendsThisCycle === 1 && lastActiveDays >= 14 && daysSinceLastSend >= 7)

        if (shouldSend && sendsThisCycle < 2) {
          await dispatch(supabaseUrl, supabaseServiceKey, u.id, 'reengagement', {
            firstName: u.first_name,
          })
          await logAutomation(supabase, u.id, 'reengagement')
          stats.inactive++
        }
      }
    } catch (e: any) {
      stats.errors.push(`${u.id}: ${e?.message || String(e)}`)
      console.error('[automation] user error', u.id, e)
    }
  }

  console.log('[automation] complete', stats)
  return json({ success: true, ...stats }, 200)
})

async function canSend(supabase: any, userId: string, type: string): Promise<boolean> {
  const days = COOLDOWNS_DAYS[type] ?? 7
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('email_automation_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('automation_type', type)
    .gte('sent_at', sinceIso)
  return (count ?? 0) === 0
}

async function logAutomation(supabase: any, userId: string, type: string) {
  await supabase.from('email_automation_log').insert({ user_id: userId, automation_type: type })
}

async function dispatch(supabaseUrl: string, key: string, userId: string, emailType: string, templateData: Record<string, unknown>) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-petswap-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ user_id: userId, email_type: emailType, template_data: templateData }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    console.error('[automation] dispatch failed', emailType, userId, res.status, t)
  }
}

async function dispatchScheduled(
  supabaseUrl: string,
  key: string,
  userId: string,
  emailType: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
  dedupeKey: string | undefined,
): Promise<boolean> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-petswap-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      user_id: userId,
      email_type: emailType,
      template_data: templateData,
      idempotency_key: idempotencyKey,
      dedupe_key: dedupeKey,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    console.error('[automation] scheduled dispatch failed', emailType, userId, res.status, t)
    return false
  }
  // send-petswap-email returns 200 with success:true OR success:false (skipped/failed).
  // Skipped (preferences off, dedupe) counts as "drained" — don't retry.
  try {
    const j = await res.json()
    if (j?.success === false && !j?.skipped) return false
  } catch {}
  return true
}

/**
 * Skip follow-up emails when the user already took the action they nudge.
 *  - match-nudge-24h / 72h: skip if `userId` already sent a message in the conversation.
 *  - review-reminder-3d: skip if `userId` already wrote a review for that swap.
 * Returns a short reason string when we should skip; null otherwise.
 */
async function shouldSkipFollowUp(
  supabase: any,
  userId: string,
  emailType: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  try {
    if (emailType === 'match-nudge-24h' || emailType === 'match-nudge-72h') {
      const conversationId = (data.conversationId || data.conversation_id) as string | undefined
      if (!conversationId) return null
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_id', userId)
      if ((count ?? 0) > 0) return 'already_messaged'
    }
    if (emailType === 'review-reminder-3d') {
      const swapId = (data.swapId || data.swap_id) as string | undefined
      if (!swapId) return null
      const { count } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('swap_id', swapId)
        .eq('reviewer_id', userId)
      if ((count ?? 0) > 0) return 'already_reviewed'
    }
    if (emailType === 'chat-no-booking-24h') {
      const conversationId = (data.conversationId || data.conversation_id) as string | undefined
      if (!conversationId) {
        // Without a conversation we can't measure chat — skip rather than spam.
        return 'no_conversation_context'
      }
      // Skip if no chat has actually started (recipient hasn't sent OR received messages).
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
      if ((msgCount ?? 0) === 0) return 'no_chat_yet'
      // Skip if a confirmed booking already exists in this conversation.
      const { count: bookingCount } = await supabase
        .from('chat_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .in('status', ['confirmed', 'completed'])
      if ((bookingCount ?? 0) > 0) return 'already_booked'
    }
  } catch (e) {
    console.error('[automation] shouldSkipFollowUp error', e)
  }
  return null
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
