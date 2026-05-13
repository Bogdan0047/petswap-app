-- Subscriptions table (canonical Stripe schema with environment column)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env ON public.subscriptions(user_id, environment, created_at DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- One-time profile boost purchases
CREATE TABLE IF NOT EXISTS public.boost_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  amount_cents integer NOT NULL DEFAULT 299,
  currency text NOT NULL DEFAULT 'gbp',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_boosts_user_active ON public.boost_purchases(user_id, expires_at DESC);

ALTER TABLE public.boost_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own boosts"
  ON public.boost_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages boosts"
  ON public.boost_purchases FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Track paywall views/conversions for analytics
CREATE TABLE IF NOT EXISTS public.paywall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger text NOT NULL, -- 'match_limit' | 'post_booking' | 'boost_cta' | 'filters' | 'priority' | 'manual'
  action text NOT NULL DEFAULT 'view', -- 'view' | 'cta_click' | 'subscribed' | 'dismissed'
  price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paywall_events_created ON public.paywall_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paywall_events_trigger ON public.paywall_events(trigger, action);

ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own paywall events"
  ON public.paywall_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users read own paywall events"
  ON public.paywall_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all paywall events"
  ON public.paywall_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Service role manages paywall events"
  ON public.paywall_events FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Daily match counter on profiles for free-tier limit
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_matches_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_matches_reset_at date NOT NULL DEFAULT current_date;

-- Helper: is user actively subscribed to Trusted Plus in given env?
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
     WHERE user_id = user_uuid
       AND environment = check_env
       AND (
         (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
  );
$$;

-- Helper: does user have an active boost?
CREATE OR REPLACE FUNCTION public.has_active_boost(user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boost_purchases
     WHERE user_id = user_uuid
       AND expires_at > now()
  );
$$;

-- Increment daily matches; returns new count. Used to enforce free-tier limit.
CREATE OR REPLACE FUNCTION public.increment_daily_matches(_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count integer;
BEGIN
  IF _user_id IS NULL THEN RETURN 0; END IF;
  UPDATE public.profiles
     SET daily_matches_count = CASE WHEN daily_matches_reset_at < current_date THEN 1 ELSE daily_matches_count + 1 END,
         daily_matches_reset_at = CASE WHEN daily_matches_reset_at < current_date THEN current_date ELSE daily_matches_reset_at END
   WHERE id = _user_id
   RETURNING daily_matches_count INTO _count;
  RETURN COALESCE(_count, 0);
END $$;

-- Admin monetization metrics
CREATE OR REPLACE FUNCTION public.get_monetization_metrics(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(days => _days);
  total_users int;
  paid_users int;
  active_subs int;
  canceled_subs int;
  mrr_pence bigint := 0;
  boost_revenue_pence bigint := 0;
  top_triggers jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT count(*) INTO total_users FROM public.profiles WHERE created_at >= cutoff;
  SELECT count(DISTINCT user_id) INTO paid_users
    FROM public.subscriptions WHERE created_at >= cutoff;
  SELECT count(*) INTO active_subs
    FROM public.subscriptions
   WHERE status IN ('active','trialing')
     AND (current_period_end IS NULL OR current_period_end > now());
  SELECT count(*) INTO canceled_subs
    FROM public.subscriptions
   WHERE status = 'canceled' AND updated_at >= cutoff;

  -- MRR estimate (£4.99 monthly = 499; £39.99 yearly ÷ 12 ≈ 333)
  SELECT COALESCE(SUM(CASE
           WHEN price_id = 'trusted_plus_monthly' THEN 499
           WHEN price_id = 'trusted_plus_yearly' THEN 333
           ELSE 0 END), 0)
    INTO mrr_pence
    FROM public.subscriptions
   WHERE status IN ('active','trialing');

  SELECT COALESCE(SUM(amount_cents), 0) INTO boost_revenue_pence
    FROM public.boost_purchases WHERE created_at >= cutoff;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.subscribed DESC), '[]'::jsonb) INTO top_triggers FROM (
    SELECT trigger,
           count(*) FILTER (WHERE action = 'view') AS views,
           count(*) FILTER (WHERE action = 'subscribed') AS subscribed
      FROM public.paywall_events
     WHERE created_at >= cutoff
     GROUP BY trigger
  ) t;

  RETURN jsonb_build_object(
    'days', _days,
    'total_new_users', total_users,
    'paid_users', paid_users,
    'active_subs', active_subs,
    'canceled_subs', canceled_subs,
    'conversion_rate', CASE WHEN total_users = 0 THEN 0 ELSE round((paid_users::numeric / total_users) * 100, 1) END,
    'churn_rate', CASE WHEN active_subs + canceled_subs = 0 THEN 0
                       ELSE round((canceled_subs::numeric / (active_subs + canceled_subs)) * 100, 1) END,
    'mrr_pence', mrr_pence,
    'boost_revenue_pence', boost_revenue_pence,
    'top_triggers', top_triggers
  );
END $$;