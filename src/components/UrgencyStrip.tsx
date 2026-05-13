import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Users, Clock } from 'lucide-react';

interface Props {
  nearbyHelpersCount: number;
  nearbyRequestsCount: number;
  joinedThisWeek?: number;
}

/**
 * Subtle, rotating urgency strip. Shows ONE quiet signal at a time so it
 * never feels spammy. Rotates every 6s with a soft fade.
 *
 * All signals are derived from real local data (helpers/requests counts +
 * a passively-cached weekly join count). We intentionally never invent
 * numbers — if a signal is empty we skip it.
 */
const UrgencyStrip = ({ nearbyHelpersCount, nearbyRequestsCount, joinedThisWeek = 0 }: Props) => {
  const signals = useMemo(() => {
    const out: { icon: typeof Users; text: string }[] = [];
    if (joinedThisWeek >= 3) out.push({ icon: Sparkles, text: `${joinedThisWeek} new neighbours joined this week` });
    if (nearbyRequestsCount >= 1) out.push({ icon: Clock, text: `${nearbyRequestsCount} pet${nearbyRequestsCount === 1 ? '' : 's'} need care nearby` });
    if (nearbyHelpersCount >= 1 && nearbyHelpersCount <= 6) out.push({ icon: Users, text: `Only ${nearbyHelpersCount} active helper${nearbyHelpersCount === 1 ? '' : 's'} in your area` });
    if (nearbyHelpersCount > 6) out.push({ icon: Users, text: `${nearbyHelpersCount} trusted helpers near you` });
    return out;
  }, [nearbyHelpersCount, nearbyRequestsCount, joinedThisWeek]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (signals.length <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % signals.length), 6000);
    return () => window.clearInterval(t);
  }, [signals.length]);

  if (signals.length === 0) return null;
  const cur = signals[idx % signals.length];
  const Icon = cur.icon;

  return (
    <div className="px-6 mt-3" aria-live="polite">
      <div
        key={idx}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/5 border border-primary/10 animate-fade-in"
      >
        <Icon size={13} className="text-primary flex-shrink-0" />
        <p className="text-[12px] text-foreground/80 truncate">{cur.text}</p>
      </div>
    </div>
  );
};

export default UrgencyStrip;
