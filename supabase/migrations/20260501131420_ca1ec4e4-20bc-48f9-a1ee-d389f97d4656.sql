-- When a notification_event row is sent, link it to a communication_event
-- if metadata.comm_event_type and source_event_id are present.
CREATE OR REPLACE FUNCTION public.link_push_to_comm_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ev_type text;
BEGIN
  -- Only act when status flips to 'sent' and metadata has a comm_event_type.
  IF NEW.status = 'sent' AND COALESCE(NEW.metadata->>'comm_event_type', '') <> '' THEN
    _ev_type := NEW.metadata->>'comm_event_type';
    UPDATE public.communication_events
       SET sent_push_at = COALESCE(sent_push_at, NEW.sent_at, now()),
           push_event_id = COALESCE(push_event_id, NEW.id),
           updated_at = now()
     WHERE user_id = NEW.user_id
       AND event_type = _ev_type
       AND COALESCE(source_event_id, '') = COALESCE(NEW.source_event_id, '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_link_push_to_comm ON public.notification_events;
CREATE TRIGGER trg_link_push_to_comm
AFTER INSERT OR UPDATE OF status ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.link_push_to_comm_event();

-- When push opened_at is set, propagate to comm event.
CREATE OR REPLACE FUNCTION public.link_push_open_to_comm_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.opened_at IS NOT NULL AND (OLD.opened_at IS NULL) THEN
    UPDATE public.communication_events
       SET opened_push_at = COALESCE(opened_push_at, NEW.opened_at),
           updated_at = now()
     WHERE push_event_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_link_push_open_to_comm ON public.notification_events;
CREATE TRIGGER trg_link_push_open_to_comm
AFTER UPDATE OF opened_at ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.link_push_open_to_comm_event();

REVOKE ALL ON FUNCTION public.link_push_to_comm_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_push_open_to_comm_event() FROM PUBLIC, anon, authenticated;