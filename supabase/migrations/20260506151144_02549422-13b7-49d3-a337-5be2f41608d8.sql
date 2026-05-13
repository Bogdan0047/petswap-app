-- Restrict pets base table SELECT to owners + admins only.
-- Cross-user browsing is provided by the public_pets view.
DROP POLICY IF EXISTS "Authenticated read pets (safe via view)" ON public.pets;

-- Restrict profiles base table SELECT to row owner + admins only.
-- Cross-user browsing is provided by the public_profiles view.
DROP POLICY IF EXISTS "Authenticated read active profiles (safe via view)" ON public.profiles;

-- Remove overly-broad chat-images upload policy.
-- The "Participants upload chat images" policy already enforces conversation membership.
DROP POLICY IF EXISTS "Chat images: authenticated upload" ON storage.objects;