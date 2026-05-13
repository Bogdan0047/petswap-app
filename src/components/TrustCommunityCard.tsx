import { useEffect, useState } from 'react';
import { ShieldCheck, Star, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  verifiedMembers: number;
  completedSwaps: number;
  reviewsThisWeek: number;
}

/**
 * Calm trust card showing real, aggregate community signals.
 * Renders nothing until at least one number is available.
 */
const TrustCommunityCard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.functions.invoke('community-stats').then(({ data }) => {
      if (!alive || !data) return;
      const d = data as Partial<Stats>;
      setStats({
        verifiedMembers: d.verifiedMembers ?? 0,
        completedSwaps: d.completedSwaps ?? 0,
        reviewsThisWeek: d.reviewsThisWeek ?? 0,
      });
    }).catch(() => { /* silent */ });
    return () => { alive = false; };
  }, []);

  if (!stats) return null;
  const total = stats.verifiedMembers + stats.completedSwaps + stats.reviewsThisWeek;
  if (total === 0) return null;

  const rows = [
    { icon: ShieldCheck, label: 'Verified members', value: stats.verifiedMembers },
    { icon: Heart, label: 'Successful swaps', value: stats.completedSwaps },
    { icon: Star, label: 'Reviews this week', value: stats.reviewsThisWeek },
  ].filter((r) => r.value > 0);

  return (
    <div className="card-flat p-5 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <ShieldCheck size={15} className="text-primary" />
        </div>
        <p className="font-semibold text-[14px]">A trusted pet community</p>
      </div>
      <div className="space-y-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-[13px]">
            <span className="inline-flex items-center gap-2 text-foreground/85">
              <Icon size={13} className="text-primary" />
              {label}
            </span>
            <span className="font-bold tabular-nums">{value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustCommunityCard;
