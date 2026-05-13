DROP POLICY IF EXISTS "Users insert own scheduled push jobs" ON public.pending_push_jobs;

CREATE POLICY "Users insert own scheduled push jobs"
ON public.pending_push_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    (notification_type = 'match' AND idempotency_key LIKE 'match_nudge_%') OR
    (notification_type = 'message' AND idempotency_key LIKE 'booking_say_hello_%') OR
    (notification_type = 'booking_confirmed' AND idempotency_key LIKE 'chat_to_booking_%')
  )
);