import { supabase } from '@/integrations/supabase/client';

/**
 * Thin wrapper around send-transactional-email.
 * Logs errors to console, never throws — email failure must never
 * break the user's primary flow (booking, match, review, etc.).
 */
export async function sendAppEmail(params: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: params.templateName,
          recipientEmail: params.recipientEmail,
          idempotencyKey: params.idempotencyKey,
          templateData: params.templateData ?? {},
        },
      },
    );
    if (error) {
      console.error(`[email:${params.templateName}] provider error`, error);
      return;
    }
    console.log(`[email:${params.templateName}] queued`, data);
  } catch (err) {
    console.error(`[email:${params.templateName}] invoke threw`, err);
  }
}

/**
 * High-level PetSwap email dispatcher.
 * Goes through send-petswap-email which checks preferences,
 * logs to email_events, and respects per-user category toggles.
 *
 * Use this for behavioural / app-triggered emails (welcome, match, booking, etc.)
 * Returns true if queued OR intentionally skipped, false on hard failure.
 */
export async function sendPetSwapEmail(params: {
  userId: string;
  emailType: string;
  templateData?: Record<string, unknown>;
  forceTransactional?: boolean;
  idempotencyKey?: string;
  /** Optional dedupe key — server stores `${emailType}:${dedupeKey}` per user. */
  dedupeKey?: string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-petswap-email', {
      body: {
        user_id: params.userId,
        email_type: params.emailType,
        template_data: params.templateData ?? {},
        force_transactional: !!params.forceTransactional,
        idempotency_key: params.idempotencyKey,
        dedupe_key: params.dedupeKey,
      },
    });
    if (error) {
      console.error(`[petswap-email:${params.emailType}] error`, error);
      return false;
    }
    console.log(`[petswap-email:${params.emailType}]`, data);
    return true;
  } catch (err) {
    console.error(`[petswap-email:${params.emailType}] invoke threw`, err);
    return false;
  }
}

/** Look up first_name + email for a user id. Returns nulls on failure. */
export async function getProfileContact(userId: string): Promise<{
  firstName: string | null;
  email: string | null;
}> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, email')
    .eq('id', userId)
    .maybeSingle();
  return {
    firstName: data?.first_name ?? null,
    email: data?.email ?? null,
  };
}
