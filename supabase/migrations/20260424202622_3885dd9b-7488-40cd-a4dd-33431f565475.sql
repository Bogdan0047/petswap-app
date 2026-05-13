-- =====================================================================
-- TRUST DOMINATION: schema, roles, triggers, RPCs
-- =====================================================================

-- ---------- 1. Roles (separate table, never on profiles) ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  role        public.app_role NOT NULL,
  granted_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 2. Profile trust columns ----------
ALTER TABLE public.profiles
  ADD COLUMN trust_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN trust_tier TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN profile_completion_pct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_active_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Extend the protect trigger to also block self-editing of new trust columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

-- ---------- 3. Reviews ----------
CREATE TABLE public.reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id            UUID NOT NULL,
  reviewer_id        UUID NOT NULL,
  reviewee_id        UUID NOT NULL,
  rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment            TEXT,
  tags               TEXT[] NOT NULL DEFAULT '{}',
  would_trust_again  BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swap_id, reviewer_id),
  CHECK (reviewer_id <> reviewee_id),
  CHECK (char_length(coalesce(comment,'')) <= 1000)
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_swap ON public.reviews(swap_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reviews"
ON public.reviews FOR SELECT TO authenticated USING (true);

-- INSERT only via submit_review RPC; no direct insert/update/delete policies.

-- ---------- 4. Reports ----------
CREATE TABLE public.reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id         UUID NOT NULL,
  reported_user_id    UUID NOT NULL,
  swap_id             UUID,
  category            TEXT NOT NULL CHECK (category IN (
    'fake_profile','unsafe_behaviour','harassment','spam',
    'no_show','misleading_info','other'
  )),
  description         TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_note          TEXT,
  resolved_at         TIMESTAMPTZ,
  resolved_by         UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX idx_reports_reported ON public.reports(reported_user_id);
CREATE INDEX idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters read own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins/mods update reports"
ON public.reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- INSERT only via report_user RPC.

CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- 5. Blocks ----------
CREATE TABLE public.blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL,
  blocked_id  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own blocks"
ON public.blocks FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users create own blocks"
ON public.blocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

CREATE POLICY "Users delete own blocks"
ON public.blocks FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);

CREATE OR REPLACE FUNCTION public.is_blocked(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

-- ---------- 6. Profile completion ----------
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.profiles;
  filled INT := 0;
  total  INT := 10;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN 0; END IF;

  IF coalesce(p.first_name,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(p.area,'') <> ''       THEN filled := filled + 1; END IF;
  IF coalesce(p.bio,'') <> ''        THEN filled := filled + 1; END IF;
  IF coalesce(p.avatar_url,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(p.postcode,'') <> ''   THEN filled := filled + 1; END IF;
  IF p.household_type IS NOT NULL    THEN filled := filled + 1; END IF;
  IF coalesce(p.pet_experience,'') <> '' THEN filled := filled + 1; END IF;
  IF p.is_email_verified             THEN filled := filled + 1; END IF;
  IF p.is_phone_verified             THEN filled := filled + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.pets WHERE owner_id = _user_id) THEN filled := filled + 1; END IF;

  RETURN (filled * 100) / total;
END;
$$;

-- ---------- 7. Trust score ----------
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.profiles;
  score INT := 0;
  completion INT;
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

  IF score > 100 THEN score := 100; END IF;
  RETURN score;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_trust(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s INT;
  c INT;
  tier TEXT;
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
      profile_completion_pct = c
  WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trust_breakdown(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.profiles;
  completion INT;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RETURN '{}'::jsonb; END IF;
  completion := public.calculate_profile_completion(_user_id);
  RETURN jsonb_build_object(
    'score', public.calculate_trust_score(_user_id),
    'tier', (SELECT trust_tier FROM public.profiles WHERE id = _user_id),
    'completion', completion,
    'email_verified', p.is_email_verified,
    'phone_verified', p.is_phone_verified,
    'id_verified', p.is_id_verified,
    'completed_swaps', p.completed_swaps,
    'average_rating', p.average_rating,
    'total_reviews', p.total_reviews,
    'response_rate', p.response_rate,
    'cancellations', p.cancellations_count
  );
END;
$$;

-- ---------- 8. submit_review RPC ----------
CREATE OR REPLACE FUNCTION public.submit_review(
  _swap_id UUID,
  _rating INT,
  _comment TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT '{}',
  _would_trust_again BOOLEAN DEFAULT true
)
RETURNS public.reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _swap public.swaps;
  _reviewee UUID;
  _row public.reviews;
  _avg NUMERIC;
  _count INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;

  SELECT * INTO _swap FROM public.swaps WHERE id = _swap_id;
  IF _swap.id IS NULL THEN RAISE EXCEPTION 'Swap not found'; END IF;
  IF _swap.status <> 'completed' THEN RAISE EXCEPTION 'Can only review completed swaps'; END IF;

  IF auth.uid() = _swap.owner_id THEN
    _reviewee := _swap.helper_id;
  ELSIF auth.uid() = _swap.helper_id THEN
    _reviewee := _swap.owner_id;
  ELSE
    RAISE EXCEPTION 'You are not a participant of this swap';
  END IF;

  INSERT INTO public.reviews (swap_id, reviewer_id, reviewee_id, rating, comment, tags, would_trust_again)
  VALUES (_swap_id, auth.uid(), _reviewee, _rating, _comment, _tags, _would_trust_again)
  RETURNING * INTO _row;

  -- Recompute reviewee aggregates
  SELECT avg(rating)::NUMERIC(3,2), count(*)
    INTO _avg, _count
  FROM public.reviews WHERE reviewee_id = _reviewee;

  UPDATE public.profiles
  SET average_rating = coalesce(_avg, 0),
      total_reviews = _count
  WHERE id = _reviewee;

  PERFORM public.recompute_trust(_reviewee);

  RETURN _row;
END;
$$;

-- ---------- 9. report_user RPC ----------
CREATE OR REPLACE FUNCTION public.report_user(
  _reported_user_id UUID,
  _category TEXT,
  _description TEXT,
  _swap_id UUID DEFAULT NULL
)
RETURNS public.reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.reports;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF auth.uid() = _reported_user_id THEN RAISE EXCEPTION 'Cannot report yourself'; END IF;

  INSERT INTO public.reports (reporter_id, reported_user_id, swap_id, category, description)
  VALUES (auth.uid(), _reported_user_id, _swap_id, _category, _description)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- ---------- 10. block / unblock RPCs ----------
CREATE OR REPLACE FUNCTION public.block_user(_blocked_user_id UUID)
RETURNS public.blocks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.blocks;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF auth.uid() = _blocked_user_id THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;

  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), _blocked_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET created_at = public.blocks.created_at
  RETURNING * INTO _row;

  -- Cancel any pending connections between the two
  UPDATE public.connections
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND ((requester_id = auth.uid() AND recipient_id = _blocked_user_id)
      OR (requester_id = _blocked_user_id AND recipient_id = auth.uid()));

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(_blocked_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.blocks WHERE blocker_id = auth.uid() AND blocked_id = _blocked_user_id;
END;
$$;

-- ---------- 11. Update create_connection to refuse blocked pairs ----------
CREATE OR REPLACE FUNCTION public.create_connection(_recipient_id UUID, _message TEXT DEFAULT NULL)
RETURNS public.connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row public.connections;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF auth.uid() = _recipient_id THEN RAISE EXCEPTION 'Cannot connect with yourself'; END IF;
  IF public.is_blocked(auth.uid(), _recipient_id) THEN
    RAISE EXCEPTION 'Cannot connect: user is blocked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status IN ('pending','accepted')
      AND ((c.requester_id = auth.uid() AND c.recipient_id = _recipient_id)
        OR (c.requester_id = _recipient_id AND c.recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'A connection already exists between these users';
  END IF;

  INSERT INTO public.connections (requester_id, recipient_id, request_message)
  VALUES (auth.uid(), _recipient_id, _message)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- ---------- 12. Recompute triggers ----------
-- Verifications: when status changes to 'approved', also flip the corresponding profile flag (admin/service path) and recompute trust.
-- Profile flag updates themselves are restricted to service_role via the protect trigger, but recompute_trust is safe to call on any change.

CREATE OR REPLACE FUNCTION public.trg_after_review_recompute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_trust(NEW.reviewee_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_reviews_recompute
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_after_review_recompute();

CREATE OR REPLACE FUNCTION public.trg_after_profile_recompute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Avoid infinite loop: only recompute if non-trust fields changed
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN RETURN NEW; END IF;
  PERFORM public.recompute_trust(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_profiles_recompute
AFTER UPDATE OF first_name, area, bio, avatar_url, postcode, household_type, pet_experience,
                is_email_verified, is_phone_verified, is_id_verified, is_address_verified,
                completed_swaps, cancellations_count, response_rate, average_rating, total_reviews
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_after_profile_recompute();

CREATE OR REPLACE FUNCTION public.trg_after_swap_recompute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_trust(NEW.owner_id);
  PERFORM public.recompute_trust(NEW.helper_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_swaps_recompute
AFTER UPDATE OF status ON public.swaps
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_after_swap_recompute();

-- ---------- 13. Refresh public_profile_view to expose trust columns ----------
DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view
WITH (security_invoker = true)
AS
SELECT
  id, first_name, avatar_url, area, bio, household_type,
  has_children, has_pets, pet_experience,
  is_email_verified, is_phone_verified, is_id_verified,
  average_rating, total_reviews, completed_swaps,
  reliability_score, subscription_tier,
  trust_score, trust_tier, profile_completion_pct, last_active_at
FROM public.profiles
WHERE is_active = true;

-- ---------- 14. Backfill ----------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.recompute_trust(r.id);
  END LOOP;
END $$;