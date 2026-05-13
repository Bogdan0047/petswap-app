// Cross-channel orchestration helper.
//
// Records a communication event so:
// - We can decide whether to send the matching email now or later
// - The push-fallback worker can dispatch an email if the push was ignored
// - The admin timeline shows a unified push→email→action history
//
// This is additive: callers continue to invoke sendPush / sendPetSwapEmail
// directly. Orchestration only RECORDS and decides FALLBACKS — it never
// blocks delivery. Anti-spam caps are enforced server-side at send-time.

import { supabase } from '@/integrations/supabase/client';

export type CommEventType =
  | 'match_created'
  | 'message_sent'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'review_submitted'
  | 'badge_earned'
  | 'inactive';

export type Channel = 'push' | 'email' | 'none';

export interface RecordCommArgs {
  userId: string;
  eventType: CommEventType;
  /** Stable domain id (conversation_id, booking_id, match key, ...). */
  sourceEventId: string;
  /** Channel that fired (or will fire) immediately. */
  primaryChannel: Channel;
  /** Channel used as fallback if primary not opened in time. */
  fallbackChannel?: Channel;
  /** Minutes to wait before considering primary "ignored". */
  fallbackAfterMinutes?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Record a communication event. Idempotent on (user, event, source).
 * Fire-and-forget: never throws.
 */
export async function recordCommEvent(args: RecordCommArgs): Promise<void> {
  try {
    await supabase.rpc('record_communication_event' as never, {
      _user_id: args.userId,
      _event_type: args.eventType,
      _source_event_id: args.sourceEventId,
      _primary_channel: args.primaryChannel,
      _fallback_channel: args.fallbackChannel ?? null,
      _fallback_after_minutes: args.fallbackAfterMinutes ?? null,
      _metadata: (args.metadata ?? {}) as never,
    } as never);
  } catch (err) {
    console.warn('[orchestrate] recordCommEvent failed', err);
  }
}

/**
 * Mark an event as converted (the user took the desired action).
 * Called from the message-send / booking-create / review-submit flows.
 */
export async function markCommConverted(
  userId: string,
  eventType: CommEventType,
  sourceEventId: string,
  conversionType: string,
): Promise<void> {
  try {
    await supabase.rpc('mark_communication_converted' as never, {
      _user_id: userId,
      _event_type: eventType,
      _source_event_id: sourceEventId,
      _conversion_type: conversionType,
    } as never);
  } catch (err) {
    console.warn('[orchestrate] markCommConverted failed', err);
  }
}
