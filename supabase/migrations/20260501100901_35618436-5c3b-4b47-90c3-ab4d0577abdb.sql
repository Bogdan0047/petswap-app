
ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS clicked_cta TEXT,
  ADD COLUMN IF NOT EXISTS converted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_events_clicked_cta ON public.email_events(clicked_cta) WHERE clicked_cta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_events_converted ON public.email_events(converted) WHERE converted = true;
