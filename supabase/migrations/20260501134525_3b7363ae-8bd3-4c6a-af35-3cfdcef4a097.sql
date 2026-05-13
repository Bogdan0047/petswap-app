-- ============================================================================
-- Phase 3: Viral Growth Engine
-- ============================================================================

-- 1) profiles.growth_score ----------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS growth_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS profiles_growth_score_idx
  ON public.profiles (growth_score DESC)
  WHERE account_status = 'active' AND is_demo = false;

-- 2) recompute_user_growth_score ---------------------------------------------
-- Pure additive composite. Rough scoring: each completed swap = 10, each
-- credited referral = 15, current streak day = 2 (cap 30), response_rate = 0..20.
-- Capped at 999.
CREATE OR REPLACE FUNCTION public.recompute_user_growth_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_swaps int := 0;
  v_refs int := 0;
  v_streak int := 0;
  v_response int := 0;
  v_score int := 0;
BEGIN
  SELECT COALESCE(completed_swaps, 0), COALESCE(response_rate, 0)
    INTO v_swaps, v_response
    FROM public.profiles WHERE id = _user_id;
  SELECT COALESCE(current_streak_days, 0) INTO v_streak
    FROM public.user_streaks WHERE user_id = _user_id;
  SELECT count(*) INTO v_refs
    FROM public.referrals
   WHERE inviter_id = _user_id AND status = 'credited';

  v_score := LEAST(
    999,
    (v_swaps * 10)
    + (v_refs * 15)
    + (LEAST(v_streak, 30) * 2)
    + LEAST(v_response, 100) / 5
  );

  UPDATE public.profiles SET growth_score = v_score WHERE id = _user_id;
  RETURN v_score;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_user_growth_score(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recompute_user_growth_score(uuid) TO authenticated, service_role;

-- 3) Trigger: credit referrer on referred user's first confirmed booking ------
CREATE OR REPLACE FUNCTION public.trg_credit_referral_on_first_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant uuid;
  ref_row public.referrals;
  earlier_count int;
  inviter_first_name text;
  invitee_first_name text;
BEGIN
  -- Only act when status transitions INTO 'confirmed'.
  IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN RETURN NEW; END IF;

  -- Walk both participants — either could be the new (referred) user.
  FOREACH participant IN ARRAY ARRAY[NEW.helper_id, NEW.owner_id] LOOP
    -- Find a pending referral where this participant is the invitee.
    SELECT * INTO ref_row FROM public.referrals
     WHERE invitee_id = participant AND status = 'pending'
     LIMIT 1;
    IF ref_row.id IS NULL THEN CONTINUE; END IF;

    -- Confirm this is their FIRST confirmed booking. Look for any earlier
    -- confirmed/completed booking they participated in.
    SELECT count(*) INTO earlier_count FROM public.chat_bookings b
     WHERE b.id <> NEW.id
       AND (b.helper_id = participant OR b.owner_id = participant)
       AND b.status IN ('confirmed', 'completed')
       AND b.updated_at <= NEW.updated_at;
    IF earlier_count > 0 THEN CONTINUE; END IF;

    -- Credit the referral.
    UPDATE public.referrals
       SET status = 'credited', credited_at = now()
     WHERE id = ref_row.id;

    -- Award the inviter the "Trusted Network" badge (idempotent).
    INSERT INTO public.user_badges (user_id, badge_type)
    VALUES (ref_row.inviter_id, 'trusted_network')
    ON CONFLICT (user_id, badge_type) DO NOTHING;

    -- Recompute inviter's growth score.
    PERFORM public.recompute_user_growth_score(ref_row.inviter_id);

    -- Queue a celebration push to the inviter (drained by push-queue-drain).
    SELECT first_name INTO invitee_first_name FROM public.profiles WHERE id = ref_row.invitee_id;
    INSERT INTO public.pending_push_jobs (
      user_id, notification_type, title, body, deep_link,
      idempotency_key, source_event_id, metadata, status, scheduled_for
    )
    VALUES (
      ref_row.inviter_id,
      'verification', -- treat referral milestones as critical-ish (always within prefs)
      '🔥 Your friend completed their first swap',
      COALESCE(invitee_first_name, 'A friend') || ' just had their first PetSwap. Thanks for inviting them.',
      '/credits',
      'referral_completed:' || ref_row.id,
      ref_row.id::text,
      jsonb_build_object('type','referral_completed','referral_id',ref_row.id,'invitee_id',ref_row.invitee_id),
      'queued',
      now()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_referral_on_first_booking ON public.chat_bookings;
CREATE TRIGGER trg_credit_referral_on_first_booking
AFTER INSERT OR UPDATE OF status ON public.chat_bookings
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION public.trg_credit_referral_on_first_booking();

-- 4) Patch redeem_referral to also queue an inviter "joined" push -------------
CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS public.referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inviter uuid;
  _row public.referrals;
  _invitee_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _code IS NULL OR _code = '' THEN RAISE EXCEPTION 'Code required'; END IF;

  SELECT id INTO _inviter FROM public.profiles WHERE referral_code = upper(_code);
  IF _inviter IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF _inviter = auth.uid() THEN RAISE EXCEPTION 'Cannot refer yourself'; END IF;

  INSERT INTO public.referrals (inviter_id, invitee_id, code)
  VALUES (_inviter, auth.uid(), upper(_code))
  ON CONFLICT (invitee_id) DO NOTHING
  RETURNING * INTO _row;

  -- New row only (skip if invitee already had a referral).
  IF _row.id IS NOT NULL THEN
    SELECT first_name INTO _invitee_name FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.pending_push_jobs (
      user_id, notification_type, title, body, deep_link,
      idempotency_key, source_event_id, metadata, status, scheduled_for
    )
    VALUES (
      _inviter,
      'verification',
      '🎉 Your friend joined PetSwap',
      COALESCE(_invitee_name, 'A friend') || ' signed up using your invite. You''ll get rewarded when they complete their first swap.',
      '/credits',
      'referral_signup:' || _row.id,
      _row.id::text,
      jsonb_build_object('type','referral_signup','referral_id',_row.id,'invitee_id',auth.uid()),
      'queued',
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_referral(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated, service_role;

-- 5) Admin viral metrics ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_viral_metrics(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(days => _days);
  invites int;
  signups int;
  credited int;
  top jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT count(*) INTO invites FROM public.referrals WHERE created_at >= cutoff;
  SELECT count(*) INTO signups FROM public.referrals
   WHERE created_at >= cutoff AND status IN ('pending','credited');
  SELECT count(*) INTO credited FROM public.referrals
   WHERE credited_at >= cutoff;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO top FROM (
    SELECT r.inviter_id,
           p.first_name,
           p.referral_code,
           count(*) FILTER (WHERE r.status = 'credited') AS credited,
           count(*) AS total
      FROM public.referrals r
      LEFT JOIN public.profiles p ON p.id = r.inviter_id
     WHERE r.created_at >= cutoff
     GROUP BY r.inviter_id, p.first_name, p.referral_code
     ORDER BY credited DESC, total DESC
     LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'days', _days,
    'invites', invites,
    'signups', signups,
    'credited', credited,
    'conversion_rate', CASE WHEN invites = 0 THEN 0 ELSE round((credited::numeric / invites) * 100, 1) END,
    'top_inviters', top
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_viral_metrics(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_viral_metrics(int) TO authenticated, service_role;