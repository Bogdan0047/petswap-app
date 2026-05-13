import { useEffect, useState } from 'react';
import { Activity, Users, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  nearbyHelpersCount: number;
  nearbyRequestsCount: number;
}

interface CacheShape {
  date: string;
  activeThisWeek: number;
  reviewsThisWeek: number;
}

const DAY_KEY = 'petswap.dailyActivity.cache';

const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Lightweight "what's happening today" card for the home screen.
 * Combines live nearby counts (already loaded) with a once-per-day
 * snapshot from `community-stats` so it never spams the network.
 */
const DailyActivityCard = ({ nearbyHelpersCount, nearbyRequestsCount }: Props) => {
  const [stats, setStats] = useState<CacheShape | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      const raw = localStorage.getItem(DAY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheShape;
        if (parsed?.date === todayKey()) {
          setStats(parsed);
          return;
        }
      }
    } catch { /* noop */ }

    void supabase.functions.invoke('community-stats').then(({ data }) => {
      if (!alive || !data) return;
      const next: CacheShape = {
        date: todayKey(),
        activeThisWeek: (data as { activeThisWeek?: number }).activeThisWeek ?? 0,
        reviewsThisWeek: (data as { reviewsThisWeek?: number }).reviewsThisWeek ?? 0,
      };
      setStats(next);
      try { localStorage.setItem(DAY_KEY, JSON.stringify(next)); } catch { /* noop */ }
    }).catch(() => { /* silent */ });
    return () => { alive = false; };
  }, []);

  const items = [
    { icon: Users, label: 'Helpers nearby', value: nearbyHelpersCount },
    { icon: MapPin, label: 'Open requests', value: nearbyRequestsCount },
    { icon: Activity, label: 'Active this week', value: stats?.activeThisWeek ?? 0 },
  ].filter((i) => i.value > 0);

  if (items.length === 0) return null;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-[14px]">Today in your area</p>
        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Live</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl bg-muted/40 p-3 flex flex-col items-start gap-1">
            <Icon size={14} className="text-primary" />
            <p className="font-bold text-[18px] tabular-nums leading-none">{value}</p>
            <p className="text-[10.5px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyActivityCard;
