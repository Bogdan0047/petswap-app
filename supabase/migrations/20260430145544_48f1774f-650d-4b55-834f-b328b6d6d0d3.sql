-- Account deletion lifecycle: soft-delete with 30-day recovery window
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Constrain valid statuses
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('active','pending_deletion','deleted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Hide pending_deletion / deleted profiles from public listings.
-- Drop the broad "non-demo" policy and replace with one that also excludes deleted.
DROP POLICY IF EXISTS "Authenticated read non-demo profiles" ON public.profiles;
CREATE POLICY "Authenticated read active profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_demo = false AND account_status = 'active');

-- Owner can always read their own profile (existing policy already covers this) — keep it.

-- Allow protect_profile_sensitive_fields trigger to permit account_status / deleted_at changes by the owner
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

  -- account_status / deleted_at: owner may set ('active' <-> 'pending_deletion'),
  -- but cannot mark themselves 'deleted' (that's a privileged/cron action).
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    IF NEW.account_status NOT IN ('active','pending_deletion') THEN
      NEW.account_status := OLD.account_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- RPC: request soft deletion (caller = owner)
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
     SET account_status = 'pending_deletion',
         deleted_at = now()
   WHERE id = auth.uid();
END; $$;

-- RPC: cancel pending deletion (restore)
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
     SET account_status = 'active',
         deleted_at = NULL
   WHERE id = auth.uid()
     AND account_status = 'pending_deletion';
END; $$;

-- RPC: get current account status (used at sign-in)
CREATE OR REPLACE FUNCTION public.get_account_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE p public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('status','anonymous'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RETURN jsonb_build_object('status','active'); END IF;
  RETURN jsonb_build_object(
    'status', p.account_status,
    'deleted_at', p.deleted_at,
    'days_left', CASE WHEN p.deleted_at IS NULL THEN NULL
                      ELSE GREATEST(0, 30 - EXTRACT(day FROM now() - p.deleted_at)::int) END
  );
END; $$;

-- Admin/cron: permanently delete profiles whose 30-day window has elapsed.
-- This marks the profile 'deleted' and clears PII; the auth.users row is left
-- to a separate privileged process (service-role) so we don't cascade-break
-- conversations/reviews unintentionally.
CREATE OR REPLACE FUNCTION public.purge_expired_deletions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n int;
BEGIN
  -- Only callable by admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  WITH purged AS (
    UPDATE public.profiles
       SET account_status = 'deleted',
           first_name = NULL,
           email = NULL,
           phone = NULL,
           bio = NULL,
           avatar_url = NULL,
           postcode = NULL,
           area = NULL
     WHERE account_status = 'pending_deletion'
       AND deleted_at IS NOT NULL
       AND deleted_at < now() - interval '30 days'
     RETURNING 1
  )
  SELECT count(*) INTO n FROM purged;
  RETURN n;
END; $$;