import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchMyProfileViewsToday } from '@/lib/profileViews';

/**
 * Tiny social-proof pill: "X viewed your profile today".
 * Renders nothing when count is 0 — never shows fake data.
 */
const ProfileViewsPill = ({ className }: { className?: string }) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchMyProfileViewsToday().then((n) => { if (alive) setCount(n); });
    return () => { alive = false; };
  }, []);
  if (!count || count < 1) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-foreground/80 text-[11px] font-semibold ${className ?? ''}`}
    >
      <Eye size={11} className="text-primary" />
      <span className="tabular-nums">{count}</span> viewed your profile today
    </span>
  );
};

export default ProfileViewsPill;
