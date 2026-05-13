
-- A/B testing for PetSwap emails
ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS conversion_type TEXT;

CREATE INDEX IF NOT EXISTS idx_email_events_type_variant
  ON public.email_events (email_type, variant);

-- Per-email-type A/B config and winner state
CREATE TABLE IF NOT EXISTS public.email_ab_config (
  email_type TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  variant_a JSONB NOT NULL DEFAULT '{}'::jsonb,
  variant_b JSONB NOT NULL DEFAULT '{}'::jsonb,
  winner TEXT CHECK (winner IN ('A','B') OR winner IS NULL),
  min_sends_per_variant INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_ab_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read ab config" ON public.email_ab_config;
CREATE POLICY "Admins read ab config" ON public.email_ab_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage ab config" ON public.email_ab_config;
CREATE POLICY "Admins manage ab config" ON public.email_ab_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manages ab config" ON public.email_ab_config;
CREATE POLICY "Service role manages ab config" ON public.email_ab_config
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed initial experiments for high-impact templates
INSERT INTO public.email_ab_config (email_type, variant_a, variant_b) VALUES
  ('new-match',
   '{"subjectOverride":"You''ve got a new PetSwap match 🐾","ctaTextOverride":"Start chat","urgencyOverride":"⏱ Most successful swaps start within the first 24 hours"}'::jsonb,
   '{"subjectOverride":"Don''t miss this match — they''re waiting","ctaTextOverride":"Message now","urgencyOverride":"🔥 Popular members get booked quickly — reply now"}'::jsonb),
  ('booking-confirmation',
   '{"ctaTextOverride":"View booking","trustOverride":"9 in 10 PetSwap bookings finish with a 5★ review."}'::jsonb,
   '{"ctaTextOverride":"Secure your dates","trustOverride":"Verified PetSwap members swap with peace of mind — every time."}'::jsonb),
  ('review-request',
   '{"ctaTextOverride":"Leave a review","incentiveOverride":""}'::jsonb,
   '{"ctaTextOverride":"Rate your swap","incentiveOverride":"⭐ Members who review get 3× more matches and faster bookings."}'::jsonb)
ON CONFLICT (email_type) DO NOTHING;
