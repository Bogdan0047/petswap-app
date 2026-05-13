-- Drop the broad cross-user SELECT policy on profiles; sensitive cols should not be readable
DROP POLICY IF EXISTS "Authenticated can read other profiles" ON public.profiles;

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;