REVOKE ALL ON FUNCTION public.user_channel_count_today(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_communication_event(uuid, text, text, text, text, integer, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_communication_converted(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_channel_count_today(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_communication_event(uuid, text, text, text, text, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_communication_converted(uuid, text, text, text) TO authenticated, service_role;