-- 1) Audit: when did permanent deletion actually happen?
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_completed_at timestamptz;

-- 2) Strengthen purge_expired_deletions:
--    - Cascades through user-owned data (pets, messages, etc.)
--    - Clears PII on profile, sets account_status='deleted',
--      stamps deletion_completed_at.
--    - Allows the cron service role to call it (not just admins),
--      so the daily job can run unattended.
CREATE OR REPLACE FUNCTION public.purge_expired_deletions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
  n int := 0;
  is_service boolean;
BEGIN
  -- Allow service_role (cron) OR admin users to invoke.
  is_service := current_setting('request.jwt.claims', true) IS NULL
                OR (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role';

  IF NOT is_service AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR uid IN
    SELECT id FROM public.profiles
     WHERE account_status = 'pending_deletion'
       AND deleted_at IS NOT NULL
       AND deleted_at <= now() - interval '30 days'
  LOOP
    -- Cascade-delete user content. Order matters where FKs exist conceptually.
    DELETE FROM public.pet_photos
      WHERE pet_id IN (SELECT id FROM public.pets WHERE owner_id = uid);
    DELETE FROM public.pets WHERE owner_id = uid;
    DELETE FROM public.care_requests WHERE creator_id = uid;
    DELETE FROM public.messages WHERE sender_id = uid;
    DELETE FROM public.chat_bookings WHERE owner_id = uid OR helper_id = uid;
    DELETE FROM public.availability WHERE user_id = uid;
    DELETE FROM public.typing_indicators WHERE user_id = uid;
    DELETE FROM public.blocks WHERE blocker_id = uid OR blocked_id = uid;
    DELETE FROM public.reports WHERE reporter_id = uid;
    DELETE FROM public.reviews WHERE reviewer_id = uid;
    DELETE FROM public.referrals WHERE inviter_id = uid OR invitee_id = uid;
    DELETE FROM public.credit_transactions WHERE user_id = uid;
    DELETE FROM public.connections WHERE requester_id = uid OR recipient_id = uid;
    DELETE FROM public.verifications WHERE user_id = uid;
    -- Conversations are 2-party; drop any the user belongs to.
    DELETE FROM public.messages
      WHERE conversation_id IN (
        SELECT id FROM public.conversations WHERE user_a = uid OR user_b = uid
      );
    DELETE FROM public.conversations WHERE user_a = uid OR user_b = uid;

    -- Strip PII from the profile and mark as deleted.
    UPDATE public.profiles
       SET account_status        = 'deleted',
           deletion_completed_at = now(),
           first_name            = NULL,
           email                 = NULL,
           phone                 = NULL,
           bio                   = NULL,
           avatar_url            = NULL,
           postcode              = NULL,
           area                  = NULL,
           emergency_contact_name  = NULL,
           emergency_contact_phone = NULL,
           referral_code         = NULL
     WHERE id = uid;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$function$;