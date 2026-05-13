import StatusBadge from '@/components/StatusBadge';
import { Star, Flame, Heart, Calendar, MessageCircle, ShieldCheck } from 'lucide-react';
import { useUserBadges } from '@/hooks/useUserBadges';

interface Props {
  /** Pass null to fetch the calling user's own badges. */
  userId: string | null;
  /** Show at most this many. Defaults to 4. */
  limit?: number;
  className?: string;
}

const KNOWN_STATUS_BADGES: Record<string, true> = {
  verified: true,
  fast_responder: true,
  reliable: true,
};

// Inline pill renderers for badge types not covered by StatusBadge.
const PILL_BADGES: Record<string, { Icon: typeof Star; label: string; tone: string }> = {
  top_rated: { Icon: Star, label: 'Top rated', tone: 'bg-warning/10 text-warning' },
  active_user: { Icon: Flame, label: 'Active member', tone: 'bg-primary/10 text-primary' },
  consistent_user: { Icon: Flame, label: 'Consistent', tone: 'bg-primary/10 text-primary' },
  trusted_user: { Icon: ShieldCheck, label: 'Trusted', tone: 'bg-success/10 text-success' },
  first_match: { Icon: Heart, label: 'First match', tone: 'bg-pink-500/10 text-pink-600' },
  first_booking: { Icon: Calendar, label: 'First booking', tone: 'bg-primary/10 text-primary' },
  first_review: { Icon: MessageCircle, label: 'First review', tone: 'bg-warning/10 text-warning' },
};

/**
 * Compact row of earned badges. Falls back to inline pills for badge types
 * not represented in StatusBadge so we never crash on a future badge_type.
 */
const BadgesRow = ({ userId, limit = 4, className }: Props) => {
  const { badges, loading } = useUserBadges(userId);
  if (loading || badges.length === 0) return null;
  const shown = badges.slice(0, limit);

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`}>
      {shown.map((b) => {
        if (KNOWN_STATUS_BADGES[b.badge_type]) {
          return <StatusBadge key={b.badge_type} type={b.badge_type as 'verified' | 'fast_responder' | 'reliable'} />;
        }
        const pill = PILL_BADGES[b.badge_type];
        if (pill) {
          const { Icon, label, tone } = pill;
          return (
            <span key={b.badge_type} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold ${tone}`}>
              <Icon size={11} /> {label}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

export default BadgesRow;

