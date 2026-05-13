-- 1. Extend messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text'
    CHECK (kind IN ('text','image','booking','system')),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_id UUID;

-- Allow body to be empty for image messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_length CHECK (length(body) >= 0 AND length(body) <= 4000);

-- 2. Presence: last_seen_at on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET last_seen_at = now(),
         last_active_at = now()
   WHERE id = auth.uid();
END;
$$;

-- 3. Chat-anchored bookings
CREATE TABLE IF NOT EXISTS public.chat_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  helper_id UUID NOT NULL,
  pet_id UUID,
  care_request_id UUID REFERENCES public.care_requests(id) ON DELETE SET NULL,
  swap_id UUID REFERENCES public.swaps(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  credits_amount INT NOT NULL DEFAULT 0,
  pickup_notes TEXT,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','confirmed','completed','cancelled')),
  proposed_by UUID NOT NULL,
  confirmed_by_owner_at TIMESTAMPTZ,
  confirmed_by_helper_at TIMESTAMPTZ,
  completed_by_owner_at TIMESTAMPTZ,
  completed_by_helper_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_bookings_distinct_users CHECK (owner_id <> helper_id),
  CONSTRAINT chat_bookings_time_order CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS idx_chat_bookings_conversation ON public.chat_bookings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_bookings_owner ON public.chat_bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_bookings_helper ON public.chat_bookings(helper_id);

ALTER TABLE public.chat_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read chat bookings"
ON public.chat_bookings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = chat_bookings.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

-- Inserts/updates only via SECURITY DEFINER RPCs below; deny direct writes.

CREATE TRIGGER chat_bookings_set_updated_at
BEFORE UPDATE ON public.chat_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK from messages.booking_id once table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_booking_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.chat_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. RPC: propose a booking inside a chat
CREATE OR REPLACE FUNCTION public.propose_chat_booking(
  _conversation_id UUID,
  _pet_id UUID,
  _start_at TIMESTAMPTZ,
  _end_at TIMESTAMPTZ,
  _credits_amount INT DEFAULT 0,
  _pickup_notes TEXT DEFAULT NULL,
  _care_request_id UUID DEFAULT NULL
)
RETURNS public.chat_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  conv public.conversations;
  other UUID;
  pet_owner UUID;
  owner_id UUID;
  helper_id UUID;
  booking public.chat_bookings;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _start_at >= _end_at THEN RAISE EXCEPTION 'start_at must be before end_at'; END IF;
  IF _credits_amount < 0 THEN RAISE EXCEPTION 'credits_amount must be non-negative'; END IF;

  SELECT * INTO conv FROM public.conversations WHERE id = _conversation_id;
  IF conv.id IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF me <> conv.user_a AND me <> conv.user_b THEN RAISE EXCEPTION 'Not a participant'; END IF;

  other := CASE WHEN me = conv.user_a THEN conv.user_b ELSE conv.user_a END;

  SELECT p.owner_id INTO pet_owner FROM public.pets p WHERE p.id = _pet_id;
  IF pet_owner IS NULL THEN RAISE EXCEPTION 'Pet not found'; END IF;
  IF pet_owner <> me AND pet_owner <> other THEN
    RAISE EXCEPTION 'Pet is not owned by either participant';
  END IF;

  owner_id := pet_owner;
  helper_id := CASE WHEN owner_id = me THEN other ELSE me END;

  INSERT INTO public.chat_bookings (
    conversation_id, owner_id, helper_id, pet_id, care_request_id,
    start_at, end_at, credits_amount, pickup_notes, proposed_by
  )
  VALUES (
    _conversation_id, owner_id, helper_id, _pet_id, _care_request_id,
    _start_at, _end_at, _credits_amount, _pickup_notes, me
  )
  RETURNING * INTO booking;

  -- Auto sign-off the proposer
  IF me = owner_id THEN
    UPDATE public.chat_bookings SET confirmed_by_owner_at = now() WHERE id = booking.id RETURNING * INTO booking;
  ELSE
    UPDATE public.chat_bookings SET confirmed_by_helper_at = now() WHERE id = booking.id RETURNING * INTO booking;
  END IF;

  -- System message in the conversation
  INSERT INTO public.messages (conversation_id, sender_id, body, kind, booking_id)
  VALUES (_conversation_id, me, 'Proposed a booking', 'booking', booking.id);

  RETURN booking;
END;
$$;

-- 5. RPC: confirm a chat booking
CREATE OR REPLACE FUNCTION public.confirm_chat_booking(_booking_id UUID)
RETURNS public.chat_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  b public.chat_bookings;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO b FROM public.chat_bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF me <> b.owner_id AND me <> b.helper_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF b.status NOT IN ('proposed','confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be confirmed in status %', b.status;
  END IF;

  IF me = b.owner_id THEN
    UPDATE public.chat_bookings SET confirmed_by_owner_at = COALESCE(confirmed_by_owner_at, now())
      WHERE id = _booking_id;
  ELSE
    UPDATE public.chat_bookings SET confirmed_by_helper_at = COALESCE(confirmed_by_helper_at, now())
      WHERE id = _booking_id;
  END IF;

  SELECT * INTO b FROM public.chat_bookings WHERE id = _booking_id;

  IF b.confirmed_by_owner_at IS NOT NULL AND b.confirmed_by_helper_at IS NOT NULL AND b.status = 'proposed' THEN
    UPDATE public.chat_bookings SET status = 'confirmed' WHERE id = _booking_id RETURNING * INTO b;
    INSERT INTO public.messages (conversation_id, sender_id, body, kind, booking_id)
    VALUES (b.conversation_id, me, 'Booking confirmed by both — see details above', 'system', b.id);
  END IF;

  RETURN b;
END;
$$;

-- 6. RPC: mark a chat booking completed (settles credits via swap when both done)
CREATE OR REPLACE FUNCTION public.mark_chat_booking_completed(_booking_id UUID)
RETURNS public.chat_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  b public.chat_bookings;
  s public.swaps;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO b FROM public.chat_bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF me <> b.owner_id AND me <> b.helper_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF b.status NOT IN ('confirmed','completed') THEN
    RAISE EXCEPTION 'Booking cannot be completed in status %', b.status;
  END IF;

  IF me = b.owner_id THEN
    UPDATE public.chat_bookings SET completed_by_owner_at = COALESCE(completed_by_owner_at, now())
      WHERE id = _booking_id;
  ELSE
    UPDATE public.chat_bookings SET completed_by_helper_at = COALESCE(completed_by_helper_at, now())
      WHERE id = _booking_id;
  END IF;

  SELECT * INTO b FROM public.chat_bookings WHERE id = _booking_id;

  IF b.completed_by_owner_at IS NOT NULL AND b.completed_by_helper_at IS NOT NULL AND b.status <> 'completed' THEN
    -- Create or update the linked swap so existing settle_swap_credits trigger fires
    IF b.swap_id IS NULL THEN
      INSERT INTO public.swaps (request_id, owner_id, helper_id, pet_id, credits_amount, start_at, end_at, status)
      VALUES (b.care_request_id, b.owner_id, b.helper_id, b.pet_id, b.credits_amount, b.start_at, b.end_at, 'completed')
      RETURNING * INTO s;
      UPDATE public.chat_bookings SET swap_id = s.id, status = 'completed' WHERE id = _booking_id RETURNING * INTO b;
    ELSE
      UPDATE public.swaps SET status = 'completed' WHERE id = b.swap_id;
      UPDATE public.chat_bookings SET status = 'completed' WHERE id = _booking_id RETURNING * INTO b;
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, body, kind, booking_id)
    VALUES (b.conversation_id, me, 'Booking complete — leave a review to grow trust', 'system', b.id);
  END IF;

  RETURN b;
END;
$$;

-- 7. Realtime publication
ALTER TABLE public.chat_bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_bookings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Storage policies for chat-images bucket (already exists, private)
-- Path convention: <conversation_id>/<user_id>/<filename>
DO $$ BEGIN
  CREATE POLICY "Participants read chat images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Participants upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Owners delete own chat images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;