ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude float8,
ADD COLUMN IF NOT EXISTS longitude float8;

CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;