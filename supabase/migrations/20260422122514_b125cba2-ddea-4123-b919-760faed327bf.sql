-- =========================================
-- PHASE 1: FOUNDATION (profiles, pets, pet_photos, verifications)
-- =========================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  email text,
  phone text,
  area text,
  postcode text,
  bio text,
  household_type text,
  has_children boolean NOT NULL DEFAULT false,
  has_pets boolean NOT NULL DEFAULT false,
  pet_experience text,
  avatar_url text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  is_email_verified boolean NOT NULL DEFAULT false,
  is_phone_verified boolean NOT NULL DEFAULT false,
  is_id_verified boolean NOT NULL DEFAULT false,
  is_address_verified boolean NOT NULL DEFAULT false,
  emergency_contact_name text,
  emergency_contact_phone text,
  reliability_score integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  completed_swaps integer NOT NULL DEFAULT 0,
  cancellations_count integer NOT NULL DEFAULT 0,
  response_rate integer NOT NULL DEFAULT 0,
  credits_balance integer NOT NULL DEFAULT 0,
  subscription_tier text NOT NULL DEFAULT 'free',
  role_preference text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_area ON public.profiles(area);
CREATE INDEX idx_profiles_postcode ON public.profiles(postcode);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX idx_profiles_reliability_score ON public.profiles(reliability_score DESC);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Read own full profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Read other profiles (full row) — UI should rely on public_profile_view, but allow read for joins
-- We restrict sensitive fields by using the view; this policy enables joins.
CREATE POLICY "Authenticated can read other profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() <> id);

-- Update own profile, but cannot self-approve verification flags or trust counters
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Block client-side flipping verification flags / trust fields via trigger
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If invoked by service_role, allow everything
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Prevent users from setting their own verification flags to true
  IF NEW.is_email_verified IS DISTINCT FROM OLD.is_email_verified
     OR NEW.is_phone_verified IS DISTINCT FROM OLD.is_phone_verified
     OR NEW.is_id_verified IS DISTINCT FROM OLD.is_id_verified
     OR NEW.is_address_verified IS DISTINCT FROM OLD.is_address_verified THEN
    NEW.is_email_verified := OLD.is_email_verified;
    NEW.is_phone_verified := OLD.is_phone_verified;
    NEW.is_id_verified := OLD.is_id_verified;
    NEW.is_address_verified := OLD.is_address_verified;
  END IF;

  -- Prevent users from editing trust/credit counters directly
  NEW.reliability_score := OLD.reliability_score;
  NEW.average_rating := OLD.average_rating;
  NEW.total_reviews := OLD.total_reviews;
  NEW.completed_swaps := OLD.completed_swaps;
  NEW.cancellations_count := OLD.cancellations_count;
  NEW.response_rate := OLD.response_rate;
  NEW.credits_balance := OLD.credits_balance;
  NEW.subscription_tier := OLD.subscription_tier;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_sensitive
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- Auto-create profile on auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- PETS
-- =========================================
CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  size text,
  age integer,
  temperament text,
  good_with_children boolean,
  good_with_pets boolean,
  feeding_notes text,
  medication_notes text,
  walking_needs text,
  special_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pets_owner ON public.pets(owner_id);
CREATE INDEX idx_pets_type ON public.pets(type);

CREATE TRIGGER pets_set_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own pets"
  ON public.pets FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authenticated can read pets"
  ON public.pets FOR SELECT
  TO authenticated
  USING (true);

-- =========================================
-- PET PHOTOS
-- =========================================
CREATE TABLE public.pet_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pet_photos_pet ON public.pet_photos(pet_id);

ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own pet photos"
  ON public.pet_photos FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_photos.pet_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_photos.pet_id AND p.owner_id = auth.uid()));

CREATE POLICY "Authenticated can read pet photos"
  ON public.pet_photos FOR SELECT
  TO authenticated
  USING (true);

-- =========================================
-- VERIFICATIONS
-- =========================================
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('email','phone','id','address')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_verifications_user ON public.verifications(user_id);
CREATE INDEX idx_verifications_type ON public.verifications(verification_type);
CREATE INDEX idx_verifications_status ON public.verifications(status);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own verifications"
  ON public.verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own pending verifications"
  ON public.verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Updates / approvals only via service_role (no policy granted to authenticated for UPDATE)

-- =========================================
-- PUBLIC PROFILE VIEW (safe fields only)
-- =========================================
CREATE VIEW public.public_profile_view
WITH (security_invoker = true)
AS
SELECT
  id,
  first_name,
  area,
  avatar_url,
  bio,
  household_type,
  has_children,
  has_pets,
  pet_experience,
  reliability_score,
  average_rating,
  total_reviews,
  completed_swaps,
  is_email_verified,
  is_phone_verified,
  is_id_verified,
  subscription_tier
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.public_profile_view TO authenticated, anon;