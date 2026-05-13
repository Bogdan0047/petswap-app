-- Reusable updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ Push subscriptions ============
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  platform text,
  is_valid boolean NOT NULL DEFAULT true,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
CREATE INDEX idx_push_subs_user_valid ON public.push_subscriptions (user_id) WHERE is_valid = true;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscriptions" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages subscriptions" ON public.push_subscriptions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============ Notification preferences ============
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  matches boolean NOT NULL DEFAULT true,
  messages boolean NOT NULL DEFAULT true,
  bookings boolean NOT NULL DEFAULT true,
  reviews boolean NOT NULL DEFAULT true,
  verification boolean NOT NULL DEFAULT true,
  safety boolean NOT NULL DEFAULT true,
  marketing boolean NOT NULL DEFAULT false,
  quiet_hours_enabled boolean NOT NULL DEFAULT true,
  quiet_start_hour integer NOT NULL DEFAULT 21,
  quiet_end_hour integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notif prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own notif prefs" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notif prefs" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all notif prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages notif prefs" ON public.notification_preferences FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============ Notification events ============
CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  skip_reason text,
  idempotency_key text,
  source_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_notif_events_user_created ON public.notification_events (user_id, created_at DESC);
CREATE INDEX idx_notif_events_type_created ON public.notification_events (notification_type, created_at DESC);
CREATE INDEX idx_notif_events_status ON public.notification_events (status);
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notif events" ON public.notification_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all notif events" ON public.notification_events FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages notif events" ON public.notification_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at triggers
CREATE TRIGGER trg_push_subs_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gate function: returns NULL if allowed, else skip-reason
CREATE OR REPLACE FUNCTION public.should_send_push(_user_id uuid, _type text, _local_hour integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs public.notification_preferences%ROWTYPE;
  is_critical boolean;
  recent_count integer;
BEGIN
  is_critical := _type IN ('safety', 'verification', 'booking_confirmed', 'booking_reminder');
  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = _user_id;
  IF NOT FOUND THEN
    IF _type = 'marketing' THEN RETURN 'pref_off'; END IF;
  ELSE
    IF _type = 'match' AND NOT prefs.matches THEN RETURN 'pref_off'; END IF;
    IF _type = 'message' AND NOT prefs.messages THEN RETURN 'pref_off'; END IF;
    IF _type IN ('booking_confirmed','booking_reminder') AND NOT prefs.bookings THEN RETURN 'pref_off'; END IF;
    IF _type = 'review_request' AND NOT prefs.reviews THEN RETURN 'pref_off'; END IF;
    IF _type = 'verification' AND NOT prefs.verification THEN RETURN 'pref_off'; END IF;
    IF _type = 'safety' AND NOT prefs.safety THEN RETURN 'pref_off'; END IF;
    IF _type = 'marketing' AND NOT prefs.marketing THEN RETURN 'pref_off'; END IF;
    IF NOT is_critical AND prefs.quiet_hours_enabled THEN
      IF prefs.quiet_start_hour > prefs.quiet_end_hour THEN
        IF _local_hour >= prefs.quiet_start_hour OR _local_hour < prefs.quiet_end_hour THEN RETURN 'quiet_hours'; END IF;
      ELSE
        IF _local_hour >= prefs.quiet_start_hour AND _local_hour < prefs.quiet_end_hour THEN RETURN 'quiet_hours'; END IF;
      END IF;
    END IF;
  END IF;
  IF NOT is_critical THEN
    SELECT count(*) INTO recent_count FROM public.notification_events
    WHERE user_id = _user_id AND status = 'sent'
      AND notification_type NOT IN ('safety','verification','booking_confirmed','booking_reminder')
      AND created_at > now() - interval '24 hours';
    IF recent_count >= 3 THEN RETURN 'rate_limited'; END IF;
  END IF;
  RETURN NULL;
END;
$$;