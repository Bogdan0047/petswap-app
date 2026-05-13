-- Bootstrap: first authenticated user can claim admin if none exists yet.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  existing_admin_count int;
  row public.user_roles;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT count(*) INTO existing_admin_count
  FROM public.user_roles WHERE role = 'admin';

  IF existing_admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Ask an existing admin to grant you access.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (me, 'admin', me)
  ON CONFLICT (user_id, role) DO NOTHING
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    SELECT * INTO row FROM public.user_roles
     WHERE user_id = me AND role = 'admin' LIMIT 1;
  END IF;

  RETURN row;
END;
$$;

-- Admin-only: grant or revoke a role for a user identified by email.
CREATE OR REPLACE FUNCTION public.set_user_role(_email text, _role app_role, _grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(me, 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RAISE EXCEPTION 'Email required';
  END IF;

  SELECT id INTO target FROM public.profiles WHERE lower(email) = lower(trim(_email));
  IF target IS NULL THEN
    RAISE EXCEPTION 'No user found with that email';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (target, _role, me)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Prevent removing the last admin.
    IF _role = 'admin' AND target = me THEN
      IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
        RAISE EXCEPTION 'Cannot revoke the last admin';
      END IF;
    END IF;
    DELETE FROM public.user_roles WHERE user_id = target AND role = _role;
  END IF;

  RETURN jsonb_build_object('user_id', target, 'role', _role, 'granted', _grant);
END;
$$;