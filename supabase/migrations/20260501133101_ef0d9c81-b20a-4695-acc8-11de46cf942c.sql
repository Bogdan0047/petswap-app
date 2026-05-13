-- Conversion funnel events: append-only, used by admin dashboard
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'match_created',
    'chat_started',
    'booking_proposal_opened',
    'booking_request_sent',
    'booking_confirmed'
  )),
  conversation_id uuid,
  booking_id uuid,
  source_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_event ON public.conversion_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_time ON public.conversion_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_events_conversation ON public.conversion_events(conversation_id);

-- Dedup: same user+event+source_event_id should collapse
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversion_events_dedup
  ON public.conversion_events(user_id, event_type, source_event_id)
  WHERE source_event_id IS NOT NULL;

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own conversion events"
  ON public.conversion_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own conversion events"
  ON public.conversion_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all conversion events"
  ON public.conversion_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages conversion events"
  ON public.conversion_events
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Aggregated funnel for admin dashboard (last N days)
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(_days integer DEFAULT 30)
RETURNS TABLE (
  matches bigint,
  chats_started bigint,
  proposals_opened bigint,
  requests_sent bigint,
  confirmed bigint,
  avg_match_to_booking_hours numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH window_events AS (
    SELECT * FROM public.conversion_events
    WHERE created_at >= now() - make_interval(days => _days)
  ),
  per_user_match AS (
    SELECT user_id, MIN(created_at) AS matched_at
    FROM window_events WHERE event_type = 'match_created'
    GROUP BY user_id
  ),
  per_user_confirm AS (
    SELECT user_id, MIN(created_at) AS confirmed_at
    FROM window_events WHERE event_type = 'booking_confirmed'
    GROUP BY user_id
  )
  SELECT
    (SELECT COUNT(*) FROM window_events WHERE event_type = 'match_created'),
    (SELECT COUNT(*) FROM window_events WHERE event_type = 'chat_started'),
    (SELECT COUNT(*) FROM window_events WHERE event_type = 'booking_proposal_opened'),
    (SELECT COUNT(*) FROM window_events WHERE event_type = 'booking_request_sent'),
    (SELECT COUNT(*) FROM window_events WHERE event_type = 'booking_confirmed'),
    (
      SELECT AVG(EXTRACT(EPOCH FROM (c.confirmed_at - m.matched_at)) / 3600.0)
      FROM per_user_match m
      JOIN per_user_confirm c USING (user_id)
      WHERE c.confirmed_at > m.matched_at
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_conversion_funnel(integer) TO authenticated;