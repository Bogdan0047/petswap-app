-- Add lightweight verification fields (no sensitive document storage)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_location_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pet_owner_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS selfie_with_pet_url text,
  ADD COLUMN IF NOT EXISTS location_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pet_owner_verified_at timestamptz;

-- Storage RLS for the existing private 'verifications' bucket so users can
-- upload only into their own folder (verifications/{user_id}/...).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users upload own selfie verifications') THEN
    CREATE POLICY "Users upload own selfie verifications"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'verifications'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users read own selfie verifications') THEN
    CREATE POLICY "Users read own selfie verifications"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'verifications'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users update own selfie verifications') THEN
    CREATE POLICY "Users update own selfie verifications"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'verifications'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users delete own selfie verifications') THEN
    CREATE POLICY "Users delete own selfie verifications"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'verifications'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Award a "pet_owner_verified" badge automatically when the flag flips on.
-- Extend recompute_user_badges to also award the new soft-verification badges.
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

  IF p.is_email_verified AND p.is_phone_verified THEN
    to_award := array_append(to_award, 'verified');
  END IF;

  -- NEW soft verifications
  IF p.is_pet_owner_verified THEN
    to_award := array_append(to_award, 'pet_owner_verified');
  END IF;
  IF p.is_location_verified THEN
    to_award := array_append(to_award, 'location_verified');
  END IF;
  IF p.avatar_url IS NOT NULL
     AND p.is_email_verified
     AND p.is_pet_owner_verified
     AND p.is_location_verified THEN
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

  IF p.trust_score >= 70 THEN
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

  SELECT EXISTS (
    SELECT 1 FROM public.reviews r WHERE r.reviewer_id = _user_id
  ) INTO has_review;
  IF has_review THEN
    to_award := array_append(to_award, 'first_review');
  END IF;

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

-- Make sure the recompute trigger fires when these new fields change too.
DROP TRIGGER IF EXISTS trg_profiles_recompute ON public.profiles;
CREATE TRIGGER trg_profiles_recompute
AFTER UPDATE OF
  first_name, area, bio, avatar_url, postcode, household_type, pet_experience,
  is_email_verified, is_phone_verified, is_id_verified, is_address_verified,
  is_location_verified, is_pet_owner_verified,
  completed_swaps, cancellations_count, response_rate, average_rating, total_reviews
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trg_after_profile_recompute();