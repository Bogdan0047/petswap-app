// Conversion funnel tracking — fire-and-forget client helper.
// Records milestones from match → chat → proposal → request → confirmed.
// Each call is idempotent on (user, event, source_event_id).

import { supabase } from '@/integrations/supabase/client';

export type ConversionEventType =
  | 'match_created'
  | 'chat_started'
  | 'booking_proposal_opened'
  | 'booking_request_sent'
  | 'booking_confirmed';

interface RecordArgs {
  userId: string;
  eventType: ConversionEventType;
  sourceEventId: string; // stable id for dedup, e.g. conversation/booking id
  conversationId?: string | null;
  bookingId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordConversionEvent(args: RecordArgs): Promise<void> {
  try {
    await supabase.from('conversion_events' as never).insert({
      user_id: args.userId,
      event_type: args.eventType,
      source_event_id: args.sourceEventId,
      conversation_id: args.conversationId ?? null,
      booking_id: args.bookingId ?? null,
      metadata: args.metadata ?? {},
    } as never);
  } catch (err) {
    // Duplicate dedup violations are expected and safe to swallow
    console.warn('[conversion] record failed', err);
  }
}
