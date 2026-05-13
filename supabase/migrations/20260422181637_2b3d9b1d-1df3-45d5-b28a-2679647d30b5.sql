-- ============================================================
-- PHASE 2: Connections, Care Requests, Swaps
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: connections
-- ------------------------------------------------------------
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  request_message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_no_self CHECK (requester_id <> recipient_id),
  CONSTRAINT connections_status_check CHECK (status IN ('pending','accepted','declined','cancelled'))
);

CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX idx_connections_status ON public.connections(status);

-- Prevent duplicate active (pending/accepted) pairs in either direction
CREATE UNIQUE INDEX idx_connections_unique_active_pair
  ON public.connections (
    LEAST(requester_id, recipient_id),
    GREATEST(requester_id, recipient_id)
  )
  WHERE status IN ('pending','accepted');

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create connections as requester"
  ON public.connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> recipient_id);

CREATE POLICY "Recipient can update connection status"
  ON public.connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = recipient_id OR auth.uid() = requester_id);

CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- TABLE: care_requests
-- ------------------------------------------------------------
CREATE TABLE public.care_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  care_type text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  notes text,
  credits_offered integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  location_area text,
  flexible_timing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_requests_time_check CHECK (start_at < end_at),
  CONSTRAINT care_requests_credits_check CHECK (credits_offered >= 0),
  CONSTRAINT care_requests_status_check CHECK (status IN ('open','pending','accepted','completed','cancelled')),
  CONSTRAINT care_requests_care_type_check CHECK (care_type IN ('day_care','evening','overnight','walk','feeding','weekend'))
);

CREATE INDEX idx_care_requests_creator ON public.care_requests(creator_id);
CREATE INDEX idx_care_requests_pet ON public.care_requests(pet_id);
CREATE INDEX idx_care_requests_status ON public.care_requests(status);
CREATE INDEX idx_care_requests_start_at ON public.care_requests(start_at);
CREATE INDEX idx_care_requests_location_area ON public.care_requests(location_area);

ALTER TABLE public.care_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read open requests"
  ON public.care_requests FOR SELECT
  TO authenticated
  USING (status = 'open' OR creator_id = auth.uid());

CREATE POLICY "Creators can insert own requests"
  ON public.care_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Creators can update own non-completed requests"
  ON public.care_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id AND status NOT IN ('completed'))
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own open requests"
  ON public.care_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id AND status = 'open');

CREATE TRIGGER trg_care_requests_updated_at
  BEFORE UPDATE ON public.care_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- TABLE: swaps
-- ------------------------------------------------------------
CREATE TABLE public.swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  owner_id uuid NOT NULL,
  helper_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  credits_amount integer NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT swaps_no_self CHECK (owner_id <> helper_id),
  CONSTRAINT swaps_time_check CHECK (start_at < end_at),
  CONSTRAINT swaps_credits_check CHECK (credits_amount >= 0),
  CONSTRAINT swaps_status_check CHECK (status IN ('scheduled','completed','cancelled','disputed'))
);

CREATE INDEX idx_swaps_owner ON public.swaps(owner_id);
CREATE INDEX idx_swaps_helper ON public.swaps(helper_id);
CREATE INDEX idx_swaps_pet ON public.swaps(pet_id);
CREATE INDEX idx_swaps_status ON public.swaps(status);
CREATE INDEX idx_swaps_start_at ON public.swaps(start_at);
CREATE INDEX idx_swaps_request ON public.swaps(request_id);

ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own swaps"
  ON public.swaps FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = helper_id);

-- No INSERT/UPDATE/DELETE policies — swaps are managed by SECURITY DEFINER functions only.

CREATE TRIGGER trg_swaps_updated_at
  BEFORE UPDATE ON public.swaps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================

-- create_connection: send a connection request
CREATE OR REPLACE FUNCTION public.create_connection(
  _recipient_id uuid,
  _message text DEFAULT NULL
)
RETURNS public.connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.connections;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() = _recipient_id THEN
    RAISE EXCEPTION 'Cannot connect with yourself';
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

-- accept_connection: only recipient
CREATE OR REPLACE FUNCTION public.accept_connection(_connection_id uuid)
RETURNS public.connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.connections;
BEGIN
  UPDATE public.connections
  SET status = 'accepted'
  WHERE id = _connection_id
    AND recipient_id = auth.uid()
    AND status = 'pending'
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found or not eligible to accept';
  END IF;
  RETURN _row;
END;
$$;

-- decline_connection: only recipient
CREATE OR REPLACE FUNCTION public.decline_connection(_connection_id uuid)
RETURNS public.connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.connections;
BEGIN
  UPDATE public.connections
  SET status = 'declined'
  WHERE id = _connection_id
    AND recipient_id = auth.uid()
    AND status = 'pending'
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found or not eligible to decline';
  END IF;
  RETURN _row;
END;
$$;

-- cancel_connection: only requester, only while pending
CREATE OR REPLACE FUNCTION public.cancel_connection(_connection_id uuid)
RETURNS public.connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.connections;
BEGIN
  UPDATE public.connections
  SET status = 'cancelled'
  WHERE id = _connection_id
    AND requester_id = auth.uid()
    AND status = 'pending'
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found or not eligible to cancel';
  END IF;
  RETURN _row;
END;
$$;

-- create_care_request
CREATE OR REPLACE FUNCTION public.create_care_request(
  _pet_id uuid,
  _care_type text,
  _start_at timestamptz,
  _end_at timestamptz,
  _credits_offered integer,
  _notes text DEFAULT NULL,
  _location_area text DEFAULT NULL,
  _flexible_timing boolean DEFAULT false
)
RETURNS public.care_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.care_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE id = _pet_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'You do not own this pet';
  END IF;
  IF _start_at >= _end_at THEN
    RAISE EXCEPTION 'start_at must be before end_at';
  END IF;
  IF _credits_offered < 0 THEN
    RAISE EXCEPTION 'credits_offered must be non-negative';
  END IF;

  INSERT INTO public.care_requests (
    creator_id, pet_id, care_type, start_at, end_at,
    credits_offered, notes, location_area, flexible_timing
  )
  VALUES (
    auth.uid(), _pet_id, _care_type, _start_at, _end_at,
    _credits_offered, _notes, _location_area, _flexible_timing
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- cancel_care_request
CREATE OR REPLACE FUNCTION public.cancel_care_request(_request_id uuid)
RETURNS public.care_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.care_requests;
BEGIN
  UPDATE public.care_requests
  SET status = 'cancelled'
  WHERE id = _request_id
    AND creator_id = auth.uid()
    AND status IN ('open','pending')
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled';
  END IF;
  RETURN _row;
END;
$$;

-- accept_care_request: helper accepts an open request → creates a swap atomically
CREATE OR REPLACE FUNCTION public.accept_care_request(_request_id uuid)
RETURNS public.swaps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.care_requests;
  _swap public.swaps;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _req FROM public.care_requests WHERE id = _request_id FOR UPDATE;
  IF _req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF _req.status <> 'open' THEN
    RAISE EXCEPTION 'Request is not open';
  END IF;
  IF _req.creator_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot accept your own request';
  END IF;

  INSERT INTO public.swaps (
    request_id, owner_id, helper_id, pet_id,
    credits_amount, start_at, end_at, status
  )
  VALUES (
    _req.id, _req.creator_id, auth.uid(), _req.pet_id,
    _req.credits_offered, _req.start_at, _req.end_at, 'scheduled'
  )
  RETURNING * INTO _swap;

  UPDATE public.care_requests
  SET status = 'accepted'
  WHERE id = _req.id;

  RETURN _swap;
END;
$$;