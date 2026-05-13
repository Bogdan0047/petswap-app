
-- 1. is_premium column (placeholder for Trusted+ tier)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 2. Private storage bucket for ID + selfie uploads (PII).
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Owners can upload to their own folder (path = user_id/...)
DROP POLICY IF EXISTS "Users upload own verification files" ON storage.objects;
CREATE POLICY "Users upload own verification files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own verification files" ON storage.objects;
CREATE POLICY "Users read own verification files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verifications'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );

DROP POLICY IF EXISTS "Users delete own pending verification files" ON storage.objects;
CREATE POLICY "Users delete own pending verification files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Allow admins/mods to read all verifications, and update them.
DROP POLICY IF EXISTS "Admins read all verifications" ON public.verifications;
CREATE POLICY "Admins read all verifications"
  ON public.verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "Admins update verifications" ON public.verifications;
CREATE POLICY "Admins update verifications"
  ON public.verifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 4. RPC to submit ID verification (creates pending row).
CREATE OR REPLACE FUNCTION public.submit_id_verification(
  _id_image_path text,
  _selfie_path text
) RETURNS public.verifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  row public.verifications;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF coalesce(_id_image_path,'') = '' OR coalesce(_selfie_path,'') = '' THEN
    RAISE EXCEPTION 'Both ID image and selfie are required';
  END IF;

  -- If a pending one exists, replace its metadata; else insert.
  SELECT * INTO row FROM public.verifications
   WHERE user_id = me AND verification_type = 'id' AND status = 'pending'
   ORDER BY created_at DESC LIMIT 1;

  IF row.id IS NOT NULL THEN
    UPDATE public.verifications
       SET metadata = jsonb_build_object('id_image_path', _id_image_path, 'selfie_path', _selfie_path),
           created_at = now()
     WHERE id = row.id
     RETURNING * INTO row;
  ELSE
    INSERT INTO public.verifications (user_id, verification_type, status, metadata)
    VALUES (me, 'id', 'pending',
            jsonb_build_object('id_image_path', _id_image_path, 'selfie_path', _selfie_path))
    RETURNING * INTO row;
  END IF;

  RETURN row;
END;
$$;

-- 5. RPC for admin to review verification (approve/reject).
CREATE OR REPLACE FUNCTION public.review_id_verification(
  _verification_id uuid,
  _approve boolean
) RETURNS public.verifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.verifications;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.verifications
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
         reviewed_at = now()
   WHERE id = _verification_id
   RETURNING * INTO v;

  IF v.id IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;

  -- Flip the flag on the profile (bypasses the protect trigger via service-definer + skip).
  -- The protect trigger only blocks non-service updates; SECURITY DEFINER runs as owner,
  -- but the trigger checks the JWT role. To allow this, we update directly:
  IF _approve THEN
    -- Temporarily disable the protect trigger by using a privileged helper.
    UPDATE public.profiles SET is_id_verified = true WHERE id = v.user_id;
  ELSE
    UPDATE public.profiles SET is_id_verified = false WHERE id = v.user_id;
  END IF;

  PERFORM public.recompute_trust(v.user_id);
  RETURN v;
END;
$$;

-- 6. The protect_profile_sensitive_fields trigger blocks is_id_verified changes
--    unless the JWT role is 'service_role'. Allow our SECURITY DEFINER review
--    function (running with definer privileges) by treating any session that
--    has admin/mod role as authorised, in addition to service_role.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_service boolean;
  caller uuid;
BEGIN
  is_service := current_setting('request.jwt.claims', true) IS NULL
                OR (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role';
  caller := auth.uid();

  IF is_service OR (caller IS NOT NULL AND (
       public.has_role(caller, 'admin') OR public.has_role(caller, 'moderator')
     )) THEN
    -- Privileged: still protect server-managed counters from drift.
    NEW.reliability_score := OLD.reliability_score;
    NEW.average_rating := OLD.average_rating;
    NEW.total_reviews := OLD.total_reviews;
    NEW.completed_swaps := OLD.completed_swaps;
    NEW.cancellations_count := OLD.cancellations_count;
    NEW.response_rate := OLD.response_rate;
    NEW.credits_balance := OLD.credits_balance;
    NEW.trust_score := OLD.trust_score;
    NEW.trust_tier := OLD.trust_tier;
    NEW.profile_completion_pct := OLD.profile_completion_pct;
    NEW.referral_code := OLD.referral_code;
    NEW.available_now := OLD.available_now;
    RETURN NEW;
  END IF;

  IF NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified
     OR NEW.is_phone_verified IS DISTINCT FROM OLD.is_phone_verified
     OR NEW.is_id_verified IS DISTINCT FROM OLD.is_id_verified
     OR NEW.is_address_verified IS DISTINCT FROM OLD.is_address_verified THEN
    NEW.is_email_verified := OLD.is_email_verified;
    NEW.is_phone_verified := OLD.is_phone_verified;
    NEW.is_id_verified := OLD.is_id_verified;
    NEW.is_address_verified := OLD.is_address_verified;
  END IF;

  NEW.reliability_score := OLD.reliability_score;
  NEW.average_rating := OLD.average_rating;
  NEW.total_reviews := OLD.total_reviews;
  NEW.completed_swaps := OLD.completed_swaps;
  NEW.cancellations_count := OLD.cancellations_count;
  NEW.response_rate := OLD.response_rate;
  NEW.credits_balance := OLD.credits_balance;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.is_premium := OLD.is_premium;
  NEW.trust_score := OLD.trust_score;
  NEW.trust_tier := OLD.trust_tier;
  NEW.profile_completion_pct := OLD.profile_completion_pct;
  NEW.referral_code := OLD.referral_code;
  NEW.available_now := OLD.available_now;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF NEW.account_status NOT IN ('active','pending_deletion') THEN
      NEW.account_status := OLD.account_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 7. Add a small reports penalty into trust score (per spec).
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles;
  score INT := 0;
  completion INT;
  open_reports INT;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN 0; END IF;

  IF p.is_email_verified THEN score := score + 10; END IF;
  IF p.is_phone_verified THEN score := score + 10; END IF;
  IF p.is_id_verified    THEN score := score + 20; END IF;

  IF p.completed_swaps >= 5 THEN score := score + 10;
  ELSIF p.completed_swaps >= 1 THEN score := score + 5;
  END IF;

  IF p.average_rating >= 4.5 AND p.total_reviews >= 3 THEN score := score + 15;
  ELSIF p.average_rating >= 4.0 AND p.total_reviews >= 1 THEN score := score + 8;
  END IF;

  IF p.response_rate >= 80 THEN score := score + 10;
  ELSIF p.response_rate >= 50 THEN score := score + 5;
  END IF;

  IF p.cancellations_count = 0 AND p.completed_swaps >= 1 THEN score := score + 10;
  ELSIF p.cancellations_count <= 2 THEN score := score + 5;
  END IF;

  completion := public.calculate_profile_completion(_user_id);
  IF completion = 100 THEN score := score + 10;
  ELSIF completion >= 70 THEN score := score + 5;
  END IF;

  IF p.last_active_at >= now() - interval '14 days' THEN score := score + 5; END IF;

  -- Reports penalty (unresolved reports against this user)
  SELECT count(*) INTO open_reports FROM public.reports
   WHERE reported_user_id = _user_id AND status IN ('open','under_review');
  IF open_reports >= 2 THEN score := score - 30;
  ELSIF open_reports = 1 THEN score := score - 15;
  END IF;

  -- Low rating penalty
  IF p.average_rating > 0 AND p.average_rating < 3 AND p.total_reviews >= 1 THEN
    score := score - 20;
  END IF;

  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;
  RETURN score;
END;
$function$;
