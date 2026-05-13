-- 1) user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_type text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_type)
);
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read badges"
ON public.user_badges FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manages badges"
ON public.user_badges FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) profile_views
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewed_user_id uuid NOT NULL,
  viewer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_views_viewed_idx
  ON public.profile_views(viewed_user_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- A user can read views of THEIR OWN profile (count widget).
CREATE POLICY "Users read own profile views"
ON public.profile_views FOR SELECT TO authenticated
USING (auth.uid() = viewed_user_id);

-- Authenticated users can log a view of someone else.
CREATE POLICY "Authenticated insert profile views"
ON public.profile_views FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND viewed_user_id <> auth.uid()
  AND (viewer_user_id IS NULL OR viewer_user_id = auth.uid())
);

CREATE POLICY "Service role manages profile views"
ON public.profile_views FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3) Helper: today's view count for the calling user
CREATE OR REPLACE FUNCTION public.get_my_profile_views_today()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(count(*), 0)::int
    FROM public.profile_views
   WHERE viewed_user_id = auth.uid()
     AND created_at >= (now() AT TIME ZONE 'UTC')::date;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile_views_today() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_views_today() TO authenticated;

-- 4) Recompute all badges for one user. Idempotent — only inserts new badges.
CREATE OR REPLACE FUNCTION public.recompute_user_badges(_user_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
  s public.user_streaks;
  avg_reply_minutes numeric;
  to_award text[] := ARRAY[]::text[];
  newly text;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN; END IF;

  SELECT * INTO s FROM public.user_streaks WHERE user_id = _user_id;

  -- verified
  IF p.is_email_verified AND p.is_phone_verified THEN
    to_award := array_append(to_award, 'verified');
  END IF;

  -- fast_responder: median first-reply within 2h across last 30 days
  -- (lightweight proxy: avg gap between OTHER's message and user's next reply)
  SELECT AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at)) / 60)
    INTO avg_reply_minutes
    FROM public.messages m1
    JOIN LATERAL (
      SELECT created_at FROM public.messages
       WHERE conversation_id = m1.conversation_id
         AND sender_id = _user_id
         AND created_at > m1.created_at
       ORDER BY created_at ASC LIMIT 1
    ) m2 ON true
   WHERE m1.sender_id <> _user_id
     AND m1.created_at >= now() - interval '30 days'
     AND EXISTS (
       SELECT 1 FROM public.conversations c
        WHERE c.id = m1.conversation_id
          AND (c.user_a = _user_id OR c.user_b = _user_id)
     );
  IF avg_reply_minutes IS NOT NULL AND avg_reply_minutes <= 120 THEN
    to_award := array_append(to_award, 'fast_responder');
  END IF;

  -- reliable
  IF p.completed_swaps >= 3 AND p.cancellations_count = 0 THEN
    to_award := array_append(to_award, 'reliable');
  END IF;

  -- top_rated
  IF p.average_rating >= 4.8 AND p.total_reviews >= 3 THEN
    to_award := array_append(to_award, 'top_rated');
  END IF;

  -- active_user (streak >= 3)
  IF s.current_streak_days IS NOT NULL AND s.current_streak_days >= 3 THEN
    to_award := array_append(to_award, 'active_user');
  END IF;

  -- Insert new ones; return only newly-earned types
  FOREACH newly IN ARRAY to_award LOOP
    INSERT INTO public.user_badges (user_id, badge_type)
    VALUES (_user_id, newly)
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    IF FOUND THEN
      RETURN NEXT newly;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_user_badges(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recompute_user_badges(uuid) TO authenticated, service_role;
