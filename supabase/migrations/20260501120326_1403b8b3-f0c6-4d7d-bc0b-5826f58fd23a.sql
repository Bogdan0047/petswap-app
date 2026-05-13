CREATE POLICY "Users insert own match nudge push jobs"
ON public.pending_push_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND notification_type = 'match'
  AND idempotency_key LIKE 'match_nudge_%'
);