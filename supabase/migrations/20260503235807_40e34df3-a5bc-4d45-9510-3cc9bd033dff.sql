
-- ============ PROFILES: restrict broad read, add admin read, create public view ============
DROP POLICY IF EXISTS "Authenticated read active profiles" ON public.profiles;

CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public-safe view (runs as view owner, bypassing RLS by design).
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id, first_name, area, postcode, avatar_url, bio,
  trust_score, trust_tier, profile_completion_pct,
  average_rating, total_reviews, completed_swaps, response_rate,
  is_email_verified, is_phone_verified, is_id_verified, is_location_verified,
  is_pet_owner_verified, is_address_verified,
  available_now, last_seen_at, last_active_at,
  latitude, longitude,
  account_status, deleted_at,
  is_premium, subscription_tier,
  created_at
FROM public.profiles
WHERE is_demo = false AND account_status = 'active';

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ============ PETS: restrict broad read, expose public-safe view ============
DROP POLICY IF EXISTS "Authenticated can read pets" ON public.pets;
-- Owner ALL policy already covers owner reads of full row.
-- Add admin read for moderation.
CREATE POLICY "Admins read all pets"
ON public.pets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP VIEW IF EXISTS public.public_pets;
CREATE VIEW public.public_pets AS
SELECT
  id, owner_id, name, type, breed, size, age, temperament,
  good_with_children, good_with_pets,
  created_at, updated_at
FROM public.pets;

GRANT SELECT ON public.public_pets TO authenticated, anon;

-- ============ STORAGE: drop broad chat-images read ============
DROP POLICY IF EXISTS "Chat images: authenticated read" ON storage.objects;

-- ============ STREAKS: drop broad read ============
DROP POLICY IF EXISTS "Authenticated read streaks" ON public.user_streaks;

-- ============ PENDING EMAIL JOBS: drop cross-user insert path ============
DROP POLICY IF EXISTS "Users insert pending email jobs for matched bookings" ON public.pending_email_jobs;
