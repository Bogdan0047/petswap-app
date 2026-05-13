CREATE TABLE IF NOT EXISTS public.pending_push_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  source_event_id text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_pending_push_jobs_due
  ON public.pending_push_jobs (status, scheduled_for);

ALTER TABLE public.pending_push_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pending push jobs"
  ON public.pending_push_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins read pending push jobs"
  ON public.pending_push_jobs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pending_push_jobs_updated_at
  BEFORE UPDATE ON public.pending_push_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();