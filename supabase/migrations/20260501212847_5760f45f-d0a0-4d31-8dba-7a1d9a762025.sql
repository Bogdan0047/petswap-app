CREATE OR REPLACE FUNCTION public.sync_my_email_verification()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  me uuid := auth.uid();
  confirmed_at timestamptz;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email_confirmed_at INTO confirmed_at
  FROM auth.users
  WHERE id = me;

  IF confirmed_at IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET is_email_verified = true,
      updated_at = now()
  WHERE id = me
    AND is_email_verified IS DISTINCT FROM true;

  PERFORM public.recompute_trust(me);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_email_verification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_my_email_verification() TO authenticated;