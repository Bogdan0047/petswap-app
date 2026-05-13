-- =========================================================
-- Growth & Liquidity Engine
-- =========================================================

-- 1. AVAILABILITY ----------------------------------------------------
CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  slot text NOT NULL DEFAULT 'all_day' CHECK (slot IN ('morning','afternoon','evening','all_day')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, slot)
);

CREATE INDEX idx_availability_user_date ON public.availability(user_id, date);
CREATE INDEX idx_availability_date ON public.availability(date);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read availability"
  ON public.availability FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own availability"
  ON public.availability FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own availability"
  ON public.availability FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. REFERRAL CODE on profiles --------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS available_now boolean NOT NULL DEFAULT false;

-- Allow protect trigger to ignore referral_code/available_now changes from triggers (they're set internally only)
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
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
  NEW.trust_score := OLD.trust_score;
  NEW.trust_tier := OLD.trust_tier;
  NEW.profile_completion_pct := OLD.profile_completion_pct;
  NEW.referral_code := OLD.referral_code;
  NEW.available_now := OLD.available_now;

  RETURN NEW;
END;
$function$;

-- 3. REFERRALS table ------------------------------------------------
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited','expired')),
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_inviter ON public.referrals(inviter_id);
CREATE INDEX idx_referrals_code ON public.referrals(code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter or invitee can read"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 4. Generate referral code on profile insert -----------------------
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  attempts int := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL AND NEW.referral_code <> '' THEN
    RETURN NEW;
  END IF;
  LOOP
    new_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
    attempts := attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) OR attempts > 10;
  END LOOP;
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_referral_code ON public.profiles;
CREATE TRIGGER trg_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill codes for existing profiles
UPDATE public.profiles
SET referral_code = upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6))
WHERE referral_code IS NULL;

-- 5. RPC: redeem referral on signup ---------------------------------
CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS public.referrals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _inviter uuid;
  _row public.referrals;
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

  RETURN _row;
END;
$$;

-- 6. Credit referrals on first completed swap -----------------------
CREATE OR REPLACE FUNCTION public.credit_referral_on_first_swap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ref public.referrals;
  _participant uuid;
  _is_first boolean;
BEGIN
  IF NEW.status <> 'completed' OR (TG_OP = 'UPDATE' AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  FOREACH _participant IN ARRAY ARRAY[NEW.owner_id, NEW.helper_id] LOOP
    SELECT * INTO _ref FROM public.referrals
    WHERE invitee_id = _participant AND status = 'pending'
    LIMIT 1;
    IF _ref.id IS NULL THEN CONTINUE; END IF;

    SELECT count(*) = 1 INTO _is_first
      FROM public.swaps
     WHERE status = 'completed'
       AND (owner_id = _participant OR helper_id = _participant);
    IF NOT _is_first THEN CONTINUE; END IF;

    UPDATE public.profiles SET credits_balance = credits_balance + 2
      WHERE id IN (_ref.inviter_id, _ref.invitee_id);
    UPDATE public.referrals SET status = 'credited', credited_at = now()
      WHERE id = _ref.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_referral ON public.swaps;
CREATE TRIGGER trg_credit_referral
  AFTER INSERT OR UPDATE OF status ON public.swaps
  FOR EACH ROW EXECUTE FUNCTION public.credit_referral_on_first_swap();

-- 7. Availability RPCs ----------------------------------------------
CREATE OR REPLACE FUNCTION public.set_availability(_dates date[], _slot text DEFAULT 'all_day')
RETURNS setof public.availability
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _d date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _slot NOT IN ('morning','afternoon','evening','all_day') THEN
    RAISE EXCEPTION 'Invalid slot';
  END IF;

  -- Clear future entries the user has
  DELETE FROM public.availability
   WHERE user_id = auth.uid() AND date >= current_date;

  IF _dates IS NOT NULL THEN
    FOREACH _d IN ARRAY _dates LOOP
      IF _d >= current_date THEN
        INSERT INTO public.availability (user_id, date, slot)
        VALUES (auth.uid(), _d, _slot)
        ON CONFLICT (user_id, date, slot) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Recompute available_now flag (any availability today or tomorrow)
  UPDATE public.profiles
     SET available_now = EXISTS (
       SELECT 1 FROM public.availability
        WHERE user_id = auth.uid()
          AND date BETWEEN current_date AND current_date + interval '1 day'
     )
   WHERE id = auth.uid();

  RETURN QUERY SELECT * FROM public.availability WHERE user_id = auth.uid() ORDER BY date;
END;
$$;

-- 8. Update public_profile_view to include new fields ---------------
DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view AS
SELECT
  id, first_name, area, bio, avatar_url,
  household_type, has_pets, has_children, pet_experience,
  is_email_verified, is_phone_verified, is_id_verified,
  average_rating, total_reviews, completed_swaps,
  reliability_score, subscription_tier,
  trust_score, trust_tier, profile_completion_pct,
  last_active_at, available_now, referral_code
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.public_profile_view TO authenticated, anon;