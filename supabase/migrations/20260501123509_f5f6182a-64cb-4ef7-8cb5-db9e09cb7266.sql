ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_type text;

CREATE INDEX IF NOT EXISTS idx_notif_events_converted
  ON public.notification_events (notification_type, converted, created_at DESC);

-- Helper: marks the most recent sent push of given type for this user as
-- converted, if it was sent within the last 7 days. Idempotent.
CREATE OR REPLACE FUNCTION public.mark_push_converted(
  _user_id uuid,
  _type text,
  _conversion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _user_id IS NULL OR _type IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _id
  FROM public.notification_events
  WHERE user_id = _user_id
    AND notification_type = _type
    AND status = 'sent'
    AND converted = false
    AND created_at > now() - interval '7 days'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _id IS NOT NULL THEN
    UPDATE public.notification_events
    SET converted = true,
        converted_at = now(),
        conversion_type = _conversion
    WHERE id = _id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_push_converted(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_push_converted(uuid, text, text) TO authenticated, service_role;