-- 1) user_streaks table — tracks daily activity streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY,
  current_streak_days integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  freezes_remaining integer NOT NULL DEFAULT 1,
  freezes_reset_month text, -- 'YYYY-MM' for monthly refill
  streak_type text NOT NULL DEFAULT 'activity',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streak"
ON public.user_streaks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages streaks"
ON public.user_streaks FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow users to read others' streaks (small public signal for badges)
CREATE POLICY "Authenticated read streaks"
ON public.user_streaks FOR SELECT TO authenticated
USING (true);

-- 2) RPC: record an activity for the calling user
CREATE OR REPLACE FUNCTION public.record_streak_activity(_activity text)
RETURNS public.user_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  this_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
  rec public.user_streaks;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  INSERT INTO public.user_streaks (user_id, current_streak_days, longest_streak, last_activity_date, freezes_reset_month)
  VALUES (uid, 1, 1, today, this_month)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO rec FROM public.user_streaks WHERE user_id = uid;

  -- Refill 1 freeze per calendar month
  IF rec.freezes_reset_month IS DISTINCT FROM this_month THEN
    rec.freezes_remaining := 1;
    rec.freezes_reset_month := this_month;
  END IF;

  IF rec.last_activity_date = today THEN
    -- already counted today; just touch updated_at
    UPDATE public.user_streaks
       SET updated_at = now(),
           freezes_remaining = rec.freezes_remaining,
           freezes_reset_month = rec.freezes_reset_month
     WHERE user_id = uid
     RETURNING * INTO rec;
    RETURN rec;
  END IF;

  IF rec.last_activity_date = today - 1 THEN
    rec.current_streak_days := rec.current_streak_days + 1;
  ELSIF rec.last_activity_date = today - 2 AND rec.freezes_remaining > 0 THEN
    -- use a streak freeze: missed exactly one day
    rec.current_streak_days := rec.current_streak_days + 1;
    rec.freezes_remaining := rec.freezes_remaining - 1;
  ELSE
    rec.current_streak_days := 1;
  END IF;

  rec.longest_streak := GREATEST(rec.longest_streak, rec.current_streak_days);
  rec.last_activity_date := today;

  UPDATE public.user_streaks
     SET current_streak_days = rec.current_streak_days,
         longest_streak = rec.longest_streak,
         last_activity_date = rec.last_activity_date,
         freezes_remaining = rec.freezes_remaining,
         freezes_reset_month = rec.freezes_reset_month,
         updated_at = now()
   WHERE user_id = uid
   RETURNING * INTO rec;

  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_streak_activity(text) TO authenticated;

-- 3) Extend pending_push_jobs insert RLS to allow new self-scheduled job types:
--    chat_3msg_nudge_* (3 messages, no booking) and match_speed_2h_*
DROP POLICY IF EXISTS "Users insert own scheduled push jobs" ON public.pending_push_jobs;

CREATE POLICY "Users insert own scheduled push jobs"
ON public.pending_push_jobs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    (notification_type = 'match' AND idempotency_key LIKE 'match_nudge_%') OR
    (notification_type = 'message' AND idempotency_key LIKE 'booking_say_hello_%') OR
    (notification_type = 'booking_confirmed' AND idempotency_key LIKE 'chat_to_booking_%') OR
    (notification_type = 'match' AND idempotency_key LIKE 'match_speed_2h:%') OR
    (notification_type = 'message' AND idempotency_key LIKE 'chat_3msg_nudge:%')
  )
);
