-- =========================================================
-- Credits Economy: immutable ledger + automated movements
-- =========================================================

-- 1. Ledger table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  type TEXT NOT NULL CHECK (type IN ('earned','spent','bonus','refund','pending_hold','release_hold')),
  reason TEXT NOT NULL CHECK (reason IN (
    'swap_completed','referral_bonus','signup_bonus','daily_login',
    'premium_boost','request_posted','request_cancelled','manual_adjustment'
  )),
  description TEXT,
  related_swap_id UUID,
  related_referral_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user_created ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX idx_credit_tx_swap ON public.credit_transactions (related_swap_id);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Members read their own ledger; admins/mods can read all
CREATE POLICY "Users read own credit transactions"
ON public.credit_transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions write here.

-- =========================================================
-- 2. Internal helper: write a ledger entry + update balance
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_credit_movement(
  _user_id UUID,
  _amount INTEGER,
  _type TEXT,
  _reason TEXT,
  _description TEXT DEFAULT NULL,
  _swap_id UUID DEFAULT NULL,
  _referral_id UUID DEFAULT NULL
) RETURNS public.credit_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance INTEGER;
  _row public.credit_transactions;
BEGIN
  IF _amount = 0 THEN RAISE EXCEPTION 'Amount must be non-zero'; END IF;

  UPDATE public.profiles
     SET credits_balance = GREATEST(credits_balance + _amount, 0)
   WHERE id = _user_id
   RETURNING credits_balance INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Profile % not found', _user_id;
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, type, reason, description,
    related_swap_id, related_referral_id, balance_after
  ) VALUES (
    _user_id, _amount, _type, _reason, _description,
    _swap_id, _referral_id, _new_balance
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- =========================================================
-- 3. Welcome bonus on profile creation (3 starter credits)
-- =========================================================
CREATE OR REPLACE FUNCTION public.grant_welcome_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_credit_movement(
    NEW.id,
    3,
    'bonus',
    'signup_bonus',
    'Welcome to PetSwap — 3 credits to get you started'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_welcome_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_welcome_credits();

-- =========================================================
-- 4. Swap completion: helper earns, owner spends, premium boost
-- =========================================================
CREATE OR REPLACE FUNCTION public.settle_swap_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_premium BOOLEAN;
  _bonus INTEGER;
BEGIN
  -- Only act on the moment a swap becomes 'completed'
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.credits_amount <= 0 THEN RETURN NEW; END IF;

  -- Owner pays
  PERFORM public.record_credit_movement(
    NEW.owner_id,
    -NEW.credits_amount,
    'spent',
    'swap_completed',
    'Care provided for your pet',
    NEW.id
  );

  -- Helper earns
  PERFORM public.record_credit_movement(
    NEW.helper_id,
    NEW.credits_amount,
    'earned',
    'swap_completed',
    'You helped a neighbour',
    NEW.id
  );

  -- Premium helper boost: +25% rounded down, minimum 1 if any boost
  SELECT subscription_tier = 'premium' INTO _is_premium
    FROM public.profiles WHERE id = NEW.helper_id;
  IF _is_premium THEN
    _bonus := GREATEST(FLOOR(NEW.credits_amount * 0.25)::INT, 1);
    PERFORM public.record_credit_movement(
      NEW.helper_id,
      _bonus,
      'bonus',
      'premium_boost',
      'Premium helper bonus (+25%)',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settle_swap_credits
AFTER INSERT OR UPDATE OF status ON public.swaps
FOR EACH ROW
EXECUTE FUNCTION public.settle_swap_credits();

-- =========================================================
-- 5. Referral bonus: rewrite previous trigger to use ledger
-- =========================================================
CREATE OR REPLACE FUNCTION public.credit_referral_on_first_swap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref public.referrals;
  _participant UUID;
  _is_first BOOLEAN;
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

    PERFORM public.record_credit_movement(
      _ref.inviter_id, 2, 'bonus', 'referral_bonus',
      'Friend you invited completed their first swap', NEW.id, _ref.id
    );
    PERFORM public.record_credit_movement(
      _ref.invitee_id, 2, 'bonus', 'referral_bonus',
      'Welcome bonus for your first swap', NEW.id, _ref.id
    );

    UPDATE public.referrals
       SET status = 'credited', credited_at = now()
     WHERE id = _ref.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- =========================================================
-- 6. Read helpers used by the UI
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_credit_summary(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance INTEGER;
  _earned INTEGER;
  _spent INTEGER;
  _bonus INTEGER;
BEGIN
  SELECT credits_balance INTO _balance FROM public.profiles WHERE id = _user_id;
  IF _balance IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'earned'), 0),
    COALESCE(-SUM(amount) FILTER (WHERE type = 'spent'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'bonus'), 0)
  INTO _earned, _spent, _bonus
  FROM public.credit_transactions
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'balance', _balance,
    'earned', _earned,
    'spent', _spent,
    'bonus', _bonus
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_credit_transactions(_limit INTEGER DEFAULT 30, _before TIMESTAMPTZ DEFAULT NULL)
RETURNS SETOF public.credit_transactions
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.credit_transactions
   WHERE user_id = auth.uid()
     AND (_before IS NULL OR created_at < _before)
   ORDER BY created_at DESC
   LIMIT GREATEST(LEAST(COALESCE(_limit, 30), 100), 1);
$$;