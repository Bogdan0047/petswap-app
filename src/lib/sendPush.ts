// Thin client helper for triggering a push notification via the
// `send-push` edge function. Fire-and-forget; never throws.
//
// Used by app code at conversion moments (new match, new message, etc.)
// and by the Admin → Notifications dashboard for test sends.

import { supabase } from '@/integrations/supabase/client';

export type PushType =
  | 'match'
  | 'message'
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'review_request'
  | 'verification'
  | 'safety'
  | 'marketing'
  | 'test';

export interface SendPushArgs {
  userId: string;
  type: PushType;
  title: string;
  body: string;
  /** In-app destination, e.g. `/inbox/<conv>` or `/profile`. */
  deepLink?: string;
  /** Stable id so retries / dupes collapse to a single event. */
  idempotencyKey?: string;
  /** Domain id of the source event (booking, conversation, ...). */
  sourceEventId?: string;
  metadata?: Record<string, unknown>;
  /** Bypass quiet-hours / rate-limit gate (admin test sends only). */
  bypassGate?: boolean;
}

export async function sendPush(args: SendPushArgs): Promise<{ ok: boolean; status?: string; reason?: string; eventId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        user_id: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        deep_link: args.deepLink,
        idempotency_key: args.idempotencyKey,
        source_event_id: args.sourceEventId,
        metadata: args.metadata ?? {},
        local_hour: new Date().getHours(),
        bypass_gate: !!args.bypassGate,
      },
    });
    if (error) {
      console.warn('[sendPush] error', error);
      return { ok: false, reason: error.message };
    }
    const d = (data ?? {}) as { ok?: boolean; status?: string; reason?: string; event_id?: string };
    return { ok: !!d.ok, status: d.status, reason: d.reason, eventId: d.event_id };
  } catch (e) {
    console.warn('[sendPush] exception', e);
    return { ok: false, reason: 'exception' };
  }
}
