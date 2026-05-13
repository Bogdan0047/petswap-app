import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Review deep-link landing page.
 *
 * Push notifications use `/reviews/:bookingId`. Reviews are submitted from
 * inside the chat thread (ChatReviewSheet), so we resolve the booking → its
 * conversation → other participant, and forward to the chat with a
 * `#review-{bookingId}` anchor that opens the review sheet pre-filled.
 *
 * Falls back to /inbox if anything goes wrong.
 */
const ReviewRedirect = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bookingId) return;
      try {
        const { data: ud } = await supabase.auth.getUser();
        const me = ud.user?.id;
        if (!me) {
          navigate(`/auth?next=/reviews/${bookingId}`, { replace: true });
          return;
        }
        const { data: booking } = await supabase
          .from('chat_bookings')
          .select('owner_id, helper_id, conversation_id')
          .eq('id', bookingId)
          .maybeSingle();
        if (cancelled) return;
        if (!booking) {
          navigate('/inbox', { replace: true });
          return;
        }
        const otherId = booking.owner_id === me ? booking.helper_id : booking.owner_id;
        navigate(`/messages?user=${otherId}#review-${bookingId}`, { replace: true });
      } catch {
        navigate('/inbox', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId, navigate]);

  if (!bookingId) return <Navigate to="/inbox" replace />;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-muted-foreground" />
    </div>
  );
};

export default ReviewRedirect;
