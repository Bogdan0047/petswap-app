import { supabase } from '@/integrations/supabase/client';

/**
 * Schedule a PetSwap email to be sent in the future.
 *
 * The job is inserted into `pending_email_jobs`. The
 * `petswap-email-automation` cron drains due jobs every 6 hours
 * and dispatches them via `send-petswap-email` (which still
 * checks preferences, suppression and per-user dedupe).
 *
 * Dedupe rules: a unique index on (user_id, email_type, dedupe_key)
 * means calling this twice with the same trio is a no-op.
 *
 * Fire-and-forget: never throws.
 */
export async function scheduleAppEmail(params: {
  userId: string;
  emailType: string;
  /** Stable per-event key (e.g. `booking-<id>`). Required for safe dedupe. */
  dedupeKey: string;
  /** Absolute time the email should be eligible to send. */
  scheduledFor: Date;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const row = {
      user_id: params.userId,
      email_type: params.emailType,
      template_data: (params.templateData ?? {}) as never,
      dedupe_key: params.dedupeKey,
      scheduled_for: params.scheduledFor.toISOString(),
      idempotency_key:
        params.idempotencyKey ??
        `${params.emailType}-${params.dedupeKey}-${params.userId}`,
    };
    const { error } = await supabase
      .from('pending_email_jobs')
      .insert(row as never);
    if (error && error.code !== '23505') {
      // 23505 = duplicate key → already scheduled, that's fine.
      console.error(`[schedule-email:${params.emailType}] insert failed`, error);
    }
  } catch (err) {
    console.error(`[schedule-email:${params.emailType}] threw`, err);
  }
}
