import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BadgeType =
  | 'verified'
  | 'fast_responder'
  | 'reliable'
  | 'top_rated'
  | 'active_user';

export interface UserBadge {
  badge_type: BadgeType;
  earned_at: string;
}

/**
 * Fetch a user's earned badges. Pass `null` to fetch the calling user.
 * Cached at the React-state level — refetches on focus.
 */
export function useUserBadges(userId: string | null) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      let id = userId;
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        id = user?.id ?? null;
      }
      if (!id) { if (alive) { setBadges([]); setLoading(false); } return; }
      const { data } = await supabase
        .from('user_badges')
        .select('badge_type, earned_at')
        .eq('user_id', id)
        .order('earned_at', { ascending: false });
      if (alive) {
        setBadges((data ?? []) as UserBadge[]);
        setLoading(false);
      }
    };
    void run();
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => { alive = false; window.removeEventListener('focus', onFocus); };
  }, [userId]);

  return { badges, loading };
}
