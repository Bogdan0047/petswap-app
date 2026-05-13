import { useMemo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '@/lib/haptic';
import { trackEvent } from '@/lib/analyticsStore';

interface Props {
  nearbyHelpersCount: number;
  nearbyRequestsCount: number;
  unreadMessages: number;
  profileCompletion?: number;
  isPremium: boolean;
}

interface Spark {
  title: string;
  sub: string;
  cta: string;
  to: string;
  event: string;
}

/**
 * "Daily reason to open the app" card. Picks ONE rotating spark per day
 * (deterministic from date so it's stable across reloads) from a list of
 * locally-relevant nudges. Never invents data — only shows a spark when
 * the underlying signal is real (real unread, real nearby supply, etc.).
 */
const DailySparkCard = ({
  nearbyHelpersCount,
  nearbyRequestsCount,
  unreadMessages,
  profileCompletion = 0,
  isPremium,
}: Props) => {
  const navigate = useNavigate();

  const sparks = useMemo<Spark[]>(() => {
    const out: Spark[] = [];
    if (unreadMessages > 0) {
      out.push({
        title: `${unreadMessages} new message${unreadMessages === 1 ? '' : 's'}`,
        sub: 'Someone is waiting for your reply.',
        cta: 'Open inbox',
        to: '/messages',
        event: 'spark_messages',
      });
    }
    if (nearbyRequestsCount > 0) {
      out.push({
        title: `${nearbyRequestsCount} pet${nearbyRequestsCount === 1 ? '' : 's'} need${nearbyRequestsCount === 1 ? 's' : ''} care nearby`,
        sub: 'Help out and earn credits.',
        cta: 'See requests',
        to: '/explore',
        event: 'spark_requests',
      });
    }
    if (nearbyHelpersCount > 0) {
      out.push({
        title: `${nearbyHelpersCount} trusted helper${nearbyHelpersCount === 1 ? '' : 's'} active near you`,
        sub: isPremium ? 'You could save £100+ on your next swap.' : 'Browse before they get booked.',
        cta: 'Explore',
        to: '/explore',
        event: 'spark_helpers',
      });
    }
    if (profileCompletion > 0 && profileCompletion < 100) {
      out.push({
        title: `Your profile is ${profileCompletion}% complete`,
        sub: 'Complete profiles get matched 3× faster.',
        cta: 'Finish profile',
        to: '/profile',
        event: 'spark_profile',
      });
    }
    return out;
  }, [unreadMessages, nearbyRequestsCount, nearbyHelpersCount, profileCompletion, isPremium]);

  // Stable per-day rotation so the card feels "fresh" without being random.
  const spark = useMemo(() => {
    if (sparks.length === 0) return null;
    const day = Math.floor(Date.now() / (24 * 60 * 60_000));
    return sparks[day % sparks.length];
  }, [sparks]);

  if (!spark) return null;

  const onTap = () => {
    haptic('light');
    trackEvent('daily_spark_tap', spark.event);
    navigate(spark.to);
  };

  return (
    <button
      onClick={onTap}
      className="w-full text-left card-elevated p-4 flex items-center gap-3 tap-feedback animate-fade-in"
      aria-label={spark.title}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={16} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[14px] leading-tight truncate">{spark.title}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{spark.sub}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold flex-shrink-0">
        {spark.cta} <ArrowRight size={13} />
      </span>
    </button>
  );
};

export default DailySparkCard;
