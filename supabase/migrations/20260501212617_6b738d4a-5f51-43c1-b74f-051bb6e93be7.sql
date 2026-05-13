-- Make avatar profile photos publicly displayable.
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp']
WHERE id = 'avatars';

-- Honest trust score: no fake ID/phone points, no passive activity/cancellation bump for brand-new users.
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles;
  score int := 0;
  open_reports int := 0;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN 0; END IF;

  IF p.is_email_verified THEN score := score + 10; END IF;
  IF coalesce(p.avatar_url, '') <> '' THEN score := score + 15; END IF;
  IF p.is_location_verified AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN score := score + 15; END IF;
  IF p.is_pet_owner_verified AND coalesce(p.selfie_with_pet_url, '') <> '' THEN score := score + 20; END IF;

  IF p.completed_swaps >= 3 THEN
    score := score + 15;
  ELSIF p.completed_swaps >= 1 THEN
    score := score + 10;
  END IF;

  IF p.average_rating >= 4.5 AND p.total_reviews >= 1 THEN
    score := score + 15;
  END IF;

  IF p.response_rate >= 80 AND (p.completed_swaps >= 1 OR p.total_reviews >= 1) THEN
    score := score + 10;
  END IF;

  SELECT count(*) INTO open_reports
  FROM public.reports
  WHERE reported_user_id = _user_id AND status IN ('open','under_review');

  IF open_reports >= 2 THEN score := score - 30;
  ELSIF open_reports = 1 THEN score := score - 15;
  END IF;

  IF p.average_rating > 0 AND p.average_rating < 3 AND p.total_reviews >= 1 THEN
    score := score - 20;
  END IF;

  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;
  RETURN score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trust_breakdown(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles;
  completion int;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN '{}'::jsonb; END IF;
  completion := public.calculate_profile_completion(_user_id);

  RETURN jsonb_build_object(
    'score', public.calculate_trust_score(_user_id),
    'tier', CASE
      WHEN public.calculate_trust_score(_user_id) >= 80 THEN 'trusted'
      WHEN public.calculate_trust_score(_user_id) >= 60 THEN 'good'
      WHEN public.calculate_trust_score(_user_id) >= 40 THEN 'improving'
      ELSE 'low'
    END,
    'completion', completion,
    'email_verified', p.is_email_verified,
    'profile_photo', coalesce(p.avatar_url, '') <> '',
    'location_verified', p.is_location_verified AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL,
    'pet_owner_verified', p.is_pet_owner_verified AND coalesce(p.selfie_with_pet_url, '') <> '',
    'phone_verified', false,
    'id_verified', false,
    'completed_swaps', p.completed_swaps,
    'average_rating', p.average_rating,
    'total_reviews', p.total_reviews,
    'response_rate', p.response_rate,
    'cancellations', p.cancellations_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_trust(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s int;
  c int;
  tier text;
BEGIN
  s := public.calculate_trust_score(_user_id);
  c := public.calculate_profile_completion(_user_id);
  tier := CASE
    WHEN s >= 80 THEN 'trusted'
    WHEN s >= 60 THEN 'good'
    WHEN s >= 40 THEN 'improving'
    ELSE 'low'
  END;

  UPDATE public.profiles
  SET trust_score = s,
      trust_tier = tier,
      profile_completion_pct = c,
      updated_at = now()
  WHERE id = _user_id;
END;
$function$;

-- Badge recompute now only awards real, non-document verification badges.
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

  IF p.is_email_verified THEN
    to_award := array_append(to_award, 'email_verified');
  END IF;
  IF p.is_pet_owner_verified AND coalesce(p.selfie_with_pet_url, '') <> '' THEN
    to_award := array_append(to_award, 'pet_owner_verified');
  END IF;
  IF p.is_location_verified AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
    to_award := array_append(to_award, 'location_verified');
  END IF;
  IF coalesce(p.avatar_url, '') <> ''
     AND p.is_email_verified
     AND p.is_pet_owner_verified AND coalesce(p.selfie_with_pet_url, '') <> ''
     AND p.is_location_verified AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
    to_award := array_append(to_award, 'fully_verified');
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

  IF p.trust_score >= 70 AND (p.completed_swaps >= 1 OR p.total_reviews >= 1) THEN
    to_award := array_append(to_award, 'trusted_user');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
     WHERE (c.user_a = _user_id OR c.user_b = _user_id)
       AND c.status = 'accepted'
  ) INTO has_match;
  IF has_match THEN
    to_award := array_append(to_award, 'first_match');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.chat_bookings b
     WHERE (b.owner_id = _user_id OR b.helper_id = _user_id)
       AND b.status IN ('confirmed', 'completed')
  ) INTO has_booking;
  IF has_booking THEN
    to_award := array_append(to_award, 'first_booking');
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewee_id = _user_id) INTO has_review;
  IF has_review THEN
    to_award := array_append(to_award, 'first_review');
  END IF;

  FOREACH newly IN ARRAY to_award LOOP
    INSERT INTO public.user_badges (user_id, badge_type)
    VALUES (_user_id, newly)
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    RETURN NEXT newly;
  END LOOP;
  RETURN;
END;
$$;

-- Recompute existing profile trust with the honest scoring formula.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.recompute_trust(r.id);
  END LOOP;
END $$;