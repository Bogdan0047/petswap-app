-- Create buckets (private, with controlled access via signed URLs / RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('pet-photos', 'pet-photos', false, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('chat-images', 'chat-images', false, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- AVATARS: path = {user_id}/...
-- =========================================
CREATE POLICY "Avatars: owners upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: owners update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: owners delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatars: authenticated can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- =========================================
-- PET PHOTOS: path = {user_id}/pets/{pet_id}/...
-- =========================================
CREATE POLICY "Pet photos: owners upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Pet photos: owners update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Pet photos: owners delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Pet photos: authenticated can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pet-photos');

-- =========================================
-- CHAT IMAGES: path = {conversation_id}/...
-- Stricter access added later when conversations table exists; for now authenticated only
-- =========================================
CREATE POLICY "Chat images: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Chat images: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-images');