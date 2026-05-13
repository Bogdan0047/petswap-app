-- 1. Add status column to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('pending','accepted','declined')),
  ADD COLUMN IF NOT EXISTS initiator_id uuid;

-- Backfill: any existing conversation is considered accepted
UPDATE public.conversations SET status = 'accepted' WHERE status IS NULL;

-- 2. Update get_or_create_conversation: new convos start as 'pending'
--    when there's no prior accepted connection between the two users.
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_other_user_id uuid)
 RETURNS conversations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me UUID := auth.uid();
  a UUID;
  b UUID;
  conv public.conversations;
  has_connection BOOLEAN;
  initial_status TEXT;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _other_user_id = me THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;
  IF public.is_blocked(me, _other_user_id) THEN
    RAISE EXCEPTION 'Conversation not allowed';
  END IF;

  IF me < _other_user_id THEN
    a := me; b := _other_user_id;
  ELSE
    a := _other_user_id; b := me;
  END IF;

  SELECT * INTO conv FROM public.conversations
  WHERE user_a = a AND user_b = b;

  IF NOT FOUND THEN
    -- If users are already connected (accepted), auto-accept the conversation.
    SELECT EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted'
        AND ((requester_id = me AND recipient_id = _other_user_id)
          OR (requester_id = _other_user_id AND recipient_id = me))
    ) INTO has_connection;

    initial_status := CASE WHEN has_connection THEN 'accepted' ELSE 'pending' END;

    INSERT INTO public.conversations (user_a, user_b, status, initiator_id)
    VALUES (a, b, initial_status, me)
    RETURNING * INTO conv;
  END IF;

  RETURN conv;
END;
$function$;

-- 3. Recipient accepts the conversation (first-message request)
CREATE OR REPLACE FUNCTION public.accept_conversation(_conversation_id uuid)
 RETURNS conversations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me UUID := auth.uid();
  conv public.conversations;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = _conversation_id FOR UPDATE;
  IF conv.id IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF me <> conv.user_a AND me <> conv.user_b THEN RAISE EXCEPTION 'Not a participant'; END IF;
  -- Only the non-initiator (the recipient) can accept.
  IF conv.initiator_id IS NOT NULL AND me = conv.initiator_id THEN
    RAISE EXCEPTION 'Only the recipient can accept this request';
  END IF;
  UPDATE public.conversations
     SET status = 'accepted'
   WHERE id = _conversation_id
   RETURNING * INTO conv;
  RETURN conv;
END;
$function$;

-- 4. Recipient declines the conversation
CREATE OR REPLACE FUNCTION public.decline_conversation(_conversation_id uuid)
 RETURNS conversations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me UUID := auth.uid();
  conv public.conversations;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO conv FROM public.conversations WHERE id = _conversation_id FOR UPDATE;
  IF conv.id IS NULL THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF me <> conv.user_a AND me <> conv.user_b THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF conv.initiator_id IS NOT NULL AND me = conv.initiator_id THEN
    RAISE EXCEPTION 'Only the recipient can decline this request';
  END IF;
  UPDATE public.conversations
     SET status = 'declined'
   WHERE id = _conversation_id
   RETURNING * INTO conv;
  RETURN conv;
END;
$function$;