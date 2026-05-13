import { Activity, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SocialProofBarProps {
  trustedOnline: number;
  completedToday: number;
}

interface CommunityStats {
  activeThisWeek: number;
  reviewsThisWeek: number;
  completedSwaps: number;
}

/**
 * Live "this app is alive" pill row sitting under the header. Mixes:
 *  - real-time online helpers (passed in)
 *  - real completed-nearby-today count (passed in)
 *  - lightweight weekly signal from `community-stats` (lazy-loaded, safe estimate fallback)
 *
 * Numbers use tabular-nums so they don't shift as data refreshes.
 */
const SocialProofBar = ({ trustedOnline, completedToday }: SocialProofBarProps) => {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.functions.invoke('community-stats').then(({ data }) => {
      if (!alive || !data) return;
      const d = data as Partial<CommunityStats>;
      setStats({
        activeThisWeek: d.activeThisWeek ?? 0,
        reviewsThisWeek: d.reviewsThisWeek ?? 0,
        completedSwaps: d.completedSwaps ?? 0,
      });
    }).catch(() => { /* ignore — pill simply won't render */ });
    return () => { alive = false; };
  }, []);

  const weeklyActive = stats?.activeThisWeek ?? 0;

  if (trustedOnline === 0 && completedToday === 0 && weeklyActive === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 animate-fade-in">
      {trustedOnline > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-success" />
          </span>
          <span className="tabular-nums">{trustedOnline}</span> trusted helper{trustedOnline === 1 ? '' : 's'} online
        </span>
      )}
      {completedToday > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground/80 text-[11px] font-semibold">
          <Activity size={11} className="text-primary" />
          <span className="tabular-nums">{completedToday}</span> completed nearby today
        </span>
      )}
      {weeklyActive > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground/80 text-[11px] font-semibold">
          <UserPlus size={11} className="text-primary" />
          <span className="tabular-nums">{weeklyActive}</span> active this week
        </span>
      )}
    </div>
  );
};

export default SocialProofBar;
