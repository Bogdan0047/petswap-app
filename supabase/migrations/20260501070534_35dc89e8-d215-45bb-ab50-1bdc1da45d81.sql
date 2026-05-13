
-- ============================================================
-- 1. EMAIL EVENTS (audit log)
-- ============================================================
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_user_id ON public.email_events(user_id);
CREATE INDEX idx_email_events_email_type ON public.email_events(email_type);
CREATE INDEX idx_email_events_status ON public.email_events(status);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own email events"
  ON public.email_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all email events"
  ON public.email_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages email events"
  ON public.email_events FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. EMAIL PREFERENCES
-- ============================================================
CREATE TABLE public.email_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  transactional_enabled BOOLEAN NOT NULL DEFAULT true,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  match_notifications BOOLEAN NOT NULL DEFAULT true,
  booking_notifications BOOLEAN NOT NULL DEFAULT true,
  review_notifications BOOLEAN NOT NULL DEFAULT true,
  trust_tips_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences"
  ON public.email_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own preferences"
  ON public.email_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND transactional_enabled = true);

CREATE POLICY "Users insert own preferences"
  ON public.email_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all preferences"
  ON public.email_preferences FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages preferences"
  ON public.email_preferences FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_email_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_email_preferences_updated_at();

INSERT INTO public.email_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. EMAIL AUTOMATION LOG (dedupe ledger for cron)
-- ============================================================
CREATE TABLE public.email_automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  automation_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_automation_lookup
  ON public.email_automation_log(user_id, automation_type, sent_at DESC);

ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages automation log"
  ON public.email_automation_log FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins read automation log"
  ON public.email_automation_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4. EXTEND handle_new_user TO CREATE PREFERENCES ROW
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. SCHEDULE petswap-email-automation EVERY 6 HOURS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE jid BIGINT;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'petswap-email-automation';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'petswap-email-automation',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gtuhzybkdvhbsraoonpb.supabase.co/functions/v1/petswap-email-automation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'),
        ''
      )
    ),
    body := jsonb_build_object('source', 'cron', 'triggered_at', now())
  );
  $cron$
);
