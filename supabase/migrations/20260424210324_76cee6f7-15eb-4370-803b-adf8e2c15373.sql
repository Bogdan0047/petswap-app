DROP VIEW IF EXISTS public.public_profile_view;
CREATE VIEW public.public_profile_view
WITH (security_invoker = true) AS
SELECT
  id, first_name, area, bio, avatar_url,
  household_type, has_pets, has_children, pet_experience,
  is_email_verified, is_phone_verified, is_id_verified,
  average_rating, total_reviews, completed_swaps,
  reliability_score, subscription_tier,
  trust_score, trust_tier, profile_completion_pct,
  last_active_at, available_now, referral_code
FROM public.profiles
WHERE is_active = true;

GRANT SELECT ON public.public_profile_view TO authenticated, anon;