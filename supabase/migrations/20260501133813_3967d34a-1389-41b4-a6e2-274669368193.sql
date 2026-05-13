-- Phase 2: extend recompute_user_badges with first-milestone badges.
-- New badge_types: first_match, first_booking, first_review, trusted_user, consistent_user.
-- These are instant-dopamine badges users earn the first time they hit a milestone.
-- Idempotent: ON CONFLICT (user_id, badge_type) DO NOTHING — never double-awards.
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
  has_match boolean;
  has_booking boolean;
  has_review boolean;
  to_award text[] := ARRAY[]::text[];
  newly text;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN; END IF;

  SELECT * INTO s FROM public.user_streaks WHERE user_id = _user_id;

  -- existing badges -----------------------------------------------------
  IF p.is_email_verified AND p.is_phone_verified THEN
    to_award := array_append(to_award, 'verified');
  END IF;

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

  IF p.completed_swaps >= 3 AND p.cancellations_count = 0 THEN
    to_award := array_append(to_award, 'reliable');
  END IF;

  IF p.average_rating >= 4.8 AND p.total_reviews >= 3 THEN
    to_award := array_append(to_award, 'top_rated');
  END IF;

  IF s.current_streak_days IS NOT NULL AND s.current_streak_days >= 3 THEN
    to_award := array_append(to_award, 'active_user');
    to_award := array_append(to_award, 'consistent_user');
  END IF;

  -- NEW: trusted_user — high trust score crosses the line
  IF p.trust_score >= 70 THEN
    to_award := array_append(to_award, 'trusted_user');
  END IF;

  -- NEW: first_match — user has any accepted conversation
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE (c.user_a = _user_id OR c.user_b = _user_id)
       AND c.status = 'accepted'
  ) INTO has_match;
  IF has_match THEN
    to_award := array_append(to_award, 'first_match');
  END IF;

  -- NEW: first_booking — user has any confirmed chat_booking
  SELECT EXISTS (
    SELECT 1 FROM public.chat_bookings b
     WHERE (b.owner_id = _user_id OR b.helper_id = _user_id)
       AND b.status IN ('confirmed', 'completed')
  ) INTO has_booking;
  IF has_booking THEN
    to_award := array_append(to_award, 'first_booking');
  END IF;

  -- NEW: first_review — user has authored a review
  SELECT EXISTS (
    SELECT 1 FROM public.reviews r WHERE r.reviewer_id = _user_id
  ) INTO has_review;
  IF has_review THEN
    to_award := array_append(to_award, 'first_review');
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