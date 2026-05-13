import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Booking deep-link landing page.
 *
 * Push notifications use `/bookings/:id` as a stable deep link. The actual
 * booking lives inside the chat thread, so we resolve the booking → its
 * conversation → the other participant, and forward to the chat where the
 * booking card is rendered.
 *
 * Falls back to /inbox if anything goes wrong.
 */
const BookingRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const { data: ud } = await supabase.auth.getUser();
        const me = ud.user?.id;
        if (!me) {
          navigate(`/auth?next=/bookings/${id}`, { replace: true });
          return;
        }
        const { data: booking } = await supabase
          .from('chat_bookings')
          .select('owner_id, helper_id, conversation_id')
          .eq('id', id)
          .maybeSingle();
        if (cancelled) return;
        if (!booking) {
          navigate('/inbox', { replace: true });
          return;
        }
        const otherId = booking.owner_id === me ? booking.helper_id : booking.owner_id;
        navigate(`/messages?user=${otherId}#booking-${id}`, { replace: true });
      } catch {
        navigate('/inbox', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (!id) return <Navigate to="/inbox" replace />;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-muted-foreground" />
    </div>
  );
};

export default BookingRedirect;
