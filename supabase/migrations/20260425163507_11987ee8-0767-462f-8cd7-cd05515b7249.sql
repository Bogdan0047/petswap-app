-- Conversations: 1:1 between two users
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_users CHECK (user_a <> user_b),
  CONSTRAINT conversations_ordered_users CHECK (user_a < user_b),
  CONSTRAINT conversations_unique_pair UNIQUE (user_a, user_b)
);

CREATE INDEX idx_conversations_user_a ON public.conversations(user_a);
CREATE INDEX idx_conversations_user_b ON public.conversations(user_b);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b)
WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read messages"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "Senders insert messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "Recipients mark as read"
ON public.messages FOR UPDATE TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
);

-- Typing indicators
CREATE TABLE public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read typing"
ON public.typing_indicators FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = typing_indicators.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "Participants upsert own typing"
ON public.typing_indicators FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = typing_indicators.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "Participants update own typing"
ON public.typing_indicators FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants delete own typing"
ON public.typing_indicators FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger: bump conversations.last_message_at + preview when a message is inserted
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.body, 140)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- RPC: get or create 1:1 conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_other_user_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  a UUID;
  b UUID;
  conv public.conversations;
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
    INSERT INTO public.conversations (user_a, user_b)
    VALUES (a, b)
    RETURNING * INTO conv;
  END IF;

  RETURN conv;
END;
$$;

-- RPC: mark all messages in a conversation as read for the caller
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  updated INTEGER;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (c.user_a = me OR c.user_b = me)
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id <> me
    AND read_at IS NULL;

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated;
END;
$$;

-- RPC: total unread for the current user
CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  total INTEGER;
BEGIN
  IF me IS NULL THEN RETURN 0; END IF;
  SELECT COUNT(*)::INT INTO total
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.sender_id <> me
    AND m.read_at IS NULL
    AND (c.user_a = me OR c.user_b = me);
  RETURN COALESCE(total, 0);
END;
$$;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;