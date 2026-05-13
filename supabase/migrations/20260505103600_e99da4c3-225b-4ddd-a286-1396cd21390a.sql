-- Revoke EXECUTE from PUBLIC and anon on all public SECURITY DEFINER functions.
-- This ensures only signed-in users (authenticated) and the server (service_role) can call them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;', r.nspname, r.proname, r.args);
  END LOOP;
END $$;