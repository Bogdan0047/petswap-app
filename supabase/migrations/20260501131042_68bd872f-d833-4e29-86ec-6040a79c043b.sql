-- Cross-channel orchestration table: single source of truth
CREATE TABLE public.communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,            -- 'match_created' | 'message_sent' | 'booking_confirmed' | 'booking_completed' | 'review_submitted' | 'badge_earned' | 'inactive'
  source_event_id text,                -- domain id (conversation, booking, etc.)
  primary_channel text NOT NULL DEFAULT 'push' CHECK (primary_channel IN ('push','email','none')),
  fallback_channel text CHECK (fallback_channel IN ('push','email','none')),
  fallback_after_minutes integer,      -- when to consider primary "ignored"
  fallback_dispatched_at timestamptz,
  sent_push_at timestamptz,
  opened_push_at timestamptz,
  push_event_id uuid,                  -- ref notification_events.id (no FK to allow cross-table flexibility)
  sent_email_at timestamptz,
  opened_email_at timestamptz,
  email_event_id uuid,                 -- ref email_events.id
  converted boolean NOT NULL DEFAULT false,
  conversion_type text,                -- 'message_sent' | 'booking_created' | 'review_submitted' | 'app_opened'
  converted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dedupe key per user + event + source
CREATE UNIQUE INDEX comm_events_user_event_source_key
  ON public.communication_events(user_id, event_type, COALESCE(source_event_id, ''));

CREATE INDEX comm_events_fallback_pending_idx
  ON public.communication_events(fallback_after_minutes, sent_push_at)
  WHERE fallback_channel = 'email' AND fallback_dispatched_at IS NULL AND opened_push_at IS NULL;

CREATE INDEX comm_events_user_recent_idx
  ON public.communication_events(user_id, created_at DESC);

ALTER TABLE public.communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages comm events"
  ON public.communication_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins read all comm events"
  ON public.communication_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own comm events"
  ON public.communication_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anti-spam: count pushes / emails sent today for a user
CREATE OR REPLACE FUNCTION public.user_channel_count_today(_user_id uuid, _channel text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _channel = 'push' THEN (
      SELECT COUNT(*)::int FROM public.notification_events
      WHERE user_id = _user_id AND status = 'sent'
        AND sent_at >= date_trunc('day', now())
    )
    WHEN _channel = 'email' THEN (
      SELECT COUNT(DISTINCT recipient_email)::int FROM public.email_events
      WHERE user_id = _user_id AND status IN ('sent','delivered','opened','clicked')
        AND COALESCE(sent_at, created_at) >= date_trunc('day', now())
    )
    ELSE 0
  END
$$;

-- Record a comm event (idempotent on user+event+source)
CREATE OR REPLACE FUNCTION public.record_communication_event(
  _user_id uuid,
  _event_type text,
  _source_event_id text,
  _primary_channel text,
  _fallback_channel text DEFAULT NULL,
  _fallback_after_minutes integer DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.communication_events
    (user_id, event_type, source_event_id, primary_channel, fallback_channel, fallback_after_minutes, metadata)
  VALUES
    (_user_id, _event_type, _source_event_id, _primary_channel, _fallback_channel, _fallback_after_minutes, _metadata)
  ON CONFLICT (user_id, event_type, COALESCE(source_event_id, ''))
  DO UPDATE SET updated_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Mark conversion (called when user takes desired action)
CREATE OR REPLACE FUNCTION public.mark_communication_converted(
  _user_id uuid,
  _event_type text,
  _source_event_id text,
  _conversion_type text
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.communication_events
     SET converted = true,
         conversion_type = _conversion_type,
         converted_at = COALESCE(converted_at, now()),
         updated_at = now()
   WHERE user_id = _user_id
     AND event_type = _event_type
     AND COALESCE(source_event_id, '') = COALESCE(_source_event_id, '')
     AND converted = false;
$$;

-- Update timestamps trigger
CREATE TRIGGER trg_comm_events_updated
BEFORE UPDATE ON public.communication_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();