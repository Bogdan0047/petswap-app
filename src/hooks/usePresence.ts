import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Heartbeats `profiles.last_seen_at` while the tab is visible.
 * Combined with realtime subscription, peers can render an online dot.
 */
export const usePresenceHeartbeat = () => {
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const beat = async () => {
      if (cancelled || document.hidden) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.rpc('update_last_seen');
    };

    beat();
    timer = window.setInterval(beat, 60_000);
    const onVis = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
};

/** Returns true when last_seen_at is within the last 2 minutes. */
export const isOnline = (lastSeenAt: string | null | undefined): boolean => {
  if (!lastSeenAt) return false;
  return Date.now() - Date.parse(lastSeenAt) < 2 * 60 * 1000;
};

/** Human label like "Active now" / "Active 5m ago" / "Last seen yesterday". */
export const presenceLabel = (lastSeenAt: string | null | undefined): string | null => {
  if (!lastSeenAt) return null;
  const ms = Date.now() - Date.parse(lastSeenAt);
  if (ms < 2 * 60 * 1000) return 'Active now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Active yesterday';
  if (days < 7) return `Active ${days}d ago`;
  return null;
};
