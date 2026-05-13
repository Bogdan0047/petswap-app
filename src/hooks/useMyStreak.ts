import { useEffect, useState, useCallback } from 'react';
import { fetchMyStreak, type UserStreak } from '@/lib/streaks';

/**
 * Subscribe to the current user's streak. Refetches on window focus so the
 * badge picks up the new count after an action without a page reload.
 */
export function useMyStreak() {
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await fetchMyStreak();
    setStreak(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('petswap:streak-changed', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('petswap:streak-changed', onFocus);
    };
  }, [refresh]);

  return { streak, loading, refresh };
}
