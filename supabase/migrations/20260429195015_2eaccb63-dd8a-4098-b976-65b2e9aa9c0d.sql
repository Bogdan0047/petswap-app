-- 1. Add is_demo flag (default false; only seeded test accounts get true).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_is_demo_idx ON public.profiles (is_demo);

-- 2. Mark the known seeded demo users (matches src/lib/userIdMap.ts).
UPDATE public.profiles
   SET is_demo = true
 WHERE id IN (
   '05fc269c-6d31-495b-89af-bc3a324cdaf4',
   'f5e6b3cc-ad4f-4aca-ae5c-8e01f29b86e4',
   '6ab3187b-0cc3-4ea6-a3e7-066c943f94c6',
   'af2f3e3c-944e-44ce-80e5-564e956ff7dc',
   'fc3f4a26-9bac-41fb-a17c-e2a5604a5721',
   '4e26c69a-39c3-46dc-8601-929985c35b01',
   'be8edd8e-c5e9-4304-9de4-c790b459175b',
   '8ae8971f-5a03-43d4-aacc-29e5fcf0fafc',
   '1f691f7c-b726-4386-9a42-0cd373e3dcda',
   'c1e88a9c-962a-4777-8383-0bbb95216b2f'
 );

-- 3. Allow authenticated users to read non-demo profiles (needed for community
--    cards, chats, reviews etc.), while demo accounts remain visible only to
--    themselves and stay out of public listings.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated read non-demo profiles" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated read non-demo profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_demo = false);
