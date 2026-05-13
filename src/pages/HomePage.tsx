import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  HandHeart,
  MessageCircle,
  Plus,
  Star,
  ShieldCheck,
  Clock,
  Gift,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import LocationPrompt from '@/components/LocationPrompt';
import BottomNav from '@/components/BottomNav';
import LazySection from '@/components/LazySection';

import HomeNotificationBell from '@/components/HomeNotificationBell';
import SocialProofBar from '@/components/SocialProofBar';
import StreakBadge from '@/components/StreakBadge';
import { useMyStreak } from '@/hooks/useMyStreak';
import NearbyDropdown from '@/components/NearbyDropdown';
import CompactTrustCard from '@/components/CompactTrustCard';
import StickyHelpCta from '@/components/StickyHelpCta';
import TrustScore from '@/components/TrustScore';
import QuickRequestSheet from '@/components/QuickRequestSheet';
import InviteSheet from '@/components/InviteSheet';
import BoostSheet from '@/components/BoostSheet';
import { useCurrentUserId, useTrustProfile } from '@/hooks/useTrustProfile';
import { useMyProfile } from '@/hooks/useMyProfile';
import UserAvatar from '@/components/UserAvatar';
import { useBlockedIds } from '@/lib/blockStore';
import { useCreditsLedger } from '@/hooks/useCreditsLedger';
import { type RadiusMiles } from '@/lib/distance';
import { trackEvent } from '@/lib/analyticsStore';
import { haptic } from '@/lib/haptic';
import { Zap } from 'lucide-react';
import { useFirstSwapState, consumeSuggestPending } from '@/hooks/useFirstSwapState';
import FirstSwapBanner from '@/components/FirstSwapBanner';
import SuggestNeighboursSheet from '@/components/SuggestNeighboursSheet';
import { useUserLocation } from '@/hooks/useUserLocation';
import PremiumDashboardCard from '@/components/PremiumDashboardCard';
import ActivationChecklist from '@/components/ActivationChecklist';
import DailyActivityCard from '@/components/DailyActivityCard';
import TrustCommunityCard from '@/components/TrustCommunityCard';
import ReengagementBanner from '@/components/ReengagementBanner';
import PremiumValueToast from '@/components/PremiumValueToast';
import UrgencyStrip from '@/components/UrgencyStrip';
import DailySparkCard from '@/components/DailySparkCard';
import { useNearbyCareRequests } from '@/hooks/useNearbyCareRequests';
import { useAuth } from '@/lib/auth';

/**
 * GOAT Home — laser-focused on three jobs:
 *   1. Get help fast (hero CTA + sticky CTA)
 *   2. Discover trusted nearby helpers (live rail)
 *   3. Bring users back daily (compact trust + credits + referral + premium)
 *
 * Everything else is deferred via <LazySection> so first paint stays fast.
 */
const HomePage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    console.log("HOME PAGE LOADED", session?.user);
  }, [session?.user]);

  // ----- Trust + identity (real, signed-in user only) -----
  const myUserId = useCurrentUserId();
  const { data: realTrust } = useTrustProfile(myUserId);
  const { profile: myProfile } = useMyProfile(myUserId);
  const { streak: myStreak } = useMyStreak();
  const myTrust = {
    score: realTrust?.score ?? 0,
    tier: (realTrust?.tier ?? 'low') as 'low' | 'improving' | 'good' | 'trusted',
    tierLabel: realTrust?.tierLabel ?? 'Building',
    completion: realTrust?.completion ?? 0,
    components: [],
    nextSteps: [],
  };

  // Real signed-in identity (never mock). Falls back gracefully.
  const myFirstName = (myProfile?.first_name ?? '').trim();
  const greetingName = myFirstName ? `Hello, ${myFirstName} 👋` : 'Hello there 👋';
  const myAvatarUrl = myProfile?.avatar_url ?? undefined;
  const myPostcode = myProfile?.postcode ?? null;
  const isPremium = myProfile?.subscription_tier === 'premium';

  // ----- Inputs -----
  const blockedIds = useBlockedIds();
  const { summary: creditSummary } = useCreditsLedger();
  const unreadMessages = useUnreadCount();

  // ----- UI state -----
  const [radius, setRadius] = useState<RadiusMiles>(10);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestHelperId, setRequestHelperId] = useState<string | undefined>();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostRequestId, setBoostRequestId] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const firstSwap = useFirstSwapState(myUserId);
  const { coords: myCoords } = useUserLocation(myUserId);

  // After location verify on Profile, open the suggestion sheet exactly once.
  useEffect(() => {
    if (consumeSuggestPending()) {
      // small delay so the user lands on Home, sees the banner, then the sheet.
      const t = window.setTimeout(() => {
        trackEvent('first_swap_suggest_open');
        setSuggestOpen(true);
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Banner impression analytics
  useEffect(() => {
    if (firstSwap.showHomeBanner) trackEvent('first_swap_banner_view');
  }, [firstSwap.showHomeBanner]);

  const openRequestFor = (helperId?: string, source = 'hero') => {
    haptic('medium');
    trackEvent('home_cta_tap', source);
    setRequestHelperId(helperId);
    setRequestOpen(true);
  };
  const closeRequest = () => {
    setRequestOpen(false);
    setTimeout(() => setRequestHelperId(undefined), 320);
  };

  // ----- Real, non-demo helpers from the database -----
  const { helpers: nearbyHelpers, allHelpers } = useNearbyHelpers({
    myPostcode,
    myCoords,
    myUserId,
    radius,
    limit: 12,
    blockedIds,
  });

  const { requests: nearbyRequests } = useNearbyCareRequests({
    myPostcode,
    myCoords,
    myUserId,
    radius,
    limit: 12,
    blockedIds,
  });

  // For brand-new users, re-rank the rail to: closest → highest trust → active in last 24h.
  // This makes the very first impression feel "near + safe + alive".
  const ACTIVE_24H_MS = 24 * 60 * 60_000;
  const wasActiveToday = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < ACTIVE_24H_MS;
  };
  const trustedHelpers = useMemo(() => {
    if (!firstSwap.isNewUser) return nearbyHelpers.slice(0, 8);
    return [...nearbyHelpers]
      .sort((a, b) => {
        const ad = a.distanceMiles ?? 999;
        const bd = b.distanceMiles ?? 999;
        if (ad !== bd) return ad - bd;
        if ((b.trust_score ?? 0) !== (a.trust_score ?? 0)) return (b.trust_score ?? 0) - (a.trust_score ?? 0);
        const aa = wasActiveToday(a.last_seen_at) ? 1 : 0;
        const ba = wasActiveToday(b.last_seen_at) ? 1 : 0;
        return ba - aa;
      })
      .slice(0, 8);
  }, [nearbyHelpers, firstSwap.isNewUser]);
  // Fallback rail used only when in-radius is empty so the page never feels dead.
  const suggestedHelpers = allHelpers.slice(0, 6);

  // Real "online now" signal — last_seen_at within the last 5 minutes.
  const isOnlineNow = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60_000;
  };
  const onlineCount = nearbyHelpers.filter((h) => isOnlineNow(h.last_seen_at)).length;

  // No fabricated stats. We only show "completed today" when we have it from a real source.
  const completedNearbyToday = 0;

  const myOpenRequests = useMemo(() => [] as Array<{ id: string }>, []);


  // ----- Scroll-depth analytics — fires once at 50% and 90% of doc -----
  useEffect(() => {
    let hit50 = false;
    let hit90 = false;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
        if (!hit50 && pct >= 50) {
          hit50 = true;
          trackEvent('home_scroll_50');
        }
        if (!hit90 && pct >= 90) {
          hit90 = true;
          trackEvent('home_scroll_90');
        }
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Single helper card renderer — reused by the live rail and the suggested
  // fallback rail so they stay visually consistent.
  const renderHelperCard = (helper: typeof nearbyHelpers[number]) => {
    const online = isOnlineNow(helper.last_seen_at);
    const name = (helper.first_name || 'Member').trim() || 'Member';
    const goToProfile = () => {
      haptic('light');
      trackEvent('home_helper_view', helper.id);
      navigate(`/profiles/${helper.id}`);
    };
    return (
      <div
        key={helper.id}
        role="button"
        tabIndex={0}
        onClick={goToProfile}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProfile(); } }}
        className="card-tappable p-4 min-w-[200px] flex-shrink-0 text-left tap-feedback cursor-pointer"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <UserAvatar name={name} src={helper.avatar_url || undefined} size={56} rounded={16} />
            {online && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-background pulse-online" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[14px] truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {helper.distanceMiles == null ? helper.area || 'Nearby' : `${helper.distanceMiles < 1 ? '<1' : Math.round(helper.distanceMiles)} mi`}
            </p>
            <div className="mt-1.5">
              <TrustScore score={helper.trust_score} tier={(helper.trust_tier as 'low' | 'improving' | 'good' | 'trusted') || 'low'} variant="pill" size="sm" showLabel={false} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3 tabular-nums">
          {helper.total_reviews > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Star size={10} className="text-warning" fill="currentColor" /> {Number(helper.average_rating).toFixed(1)}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/80">New member</span>
          )}
          {helper.response_rate > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock size={10} /> {helper.response_rate}%
              </span>
            </>
          )}
          {online && (
            <>
              <span>·</span>
              <span className="text-success font-semibold">Available</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goToProfile(); }}
            className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold tap-feedback"
          >
            View profile <ChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openRequestFor(helper.id, 'helper-rail');
            }}
            className="text-[12px] font-semibold text-primary-foreground bg-primary rounded-full px-3 py-1.5 tap-feedback"
          >
            Send request
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ===== HEADER ===== */}
      <header className="px-6 pt-8 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/profile')}
              className="flex-shrink-0 tap-feedback rounded-full"
              aria-label="Open your profile"
            >
              <UserAvatar
                name={myFirstName || 'You'}
                src={myAvatarUrl}
                size={44}
                rounded={22}
              />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-[20px] leading-tight truncate">
                {greetingName}
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                Trusted neighbours near you
              </p>
            </div>
          </div>
          <HomeNotificationBell />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SocialProofBar trustedOnline={onlineCount} completedToday={completedNearbyToday} />
          <StreakBadge streak={myStreak} variant="pill" />
        </div>
      </header>

      {/* ===== URGENCY STRIP — quiet rotating signal ===== */}
      <UrgencyStrip
        nearbyHelpersCount={nearbyHelpers.length}
        nearbyRequestsCount={nearbyRequests.length}
      />

      {/* ===== DAILY SPARK — daily reason to open the app ===== */}
      <div className="px-6 mt-4">
        <DailySparkCard
          nearbyHelpersCount={nearbyHelpers.length}
          nearbyRequestsCount={nearbyRequests.length}
          unreadMessages={unreadMessages}
          profileCompletion={myTrust.completion}
          isPremium={isPremium}
        />
      </div>

      {/* ===== PREMIUM DASHBOARD (active subscribers) ===== */}
      <PremiumDashboardCard userId={myUserId} />

      {/* ===== ACTIVATION CHECKLIST (first 36h after subscribing) ===== */}
      <ActivationChecklist userId={myUserId} />

      {/* ===== RE-ENGAGEMENT (returning users) ===== */}
      <div className="px-6 mt-4">
        <ReengagementBanner
          newMatchesCount={trustedHelpers.length}
          onCta={() => {
            haptic('light');
            navigate('/explore');
          }}
        />
      </div>

      {/* ===== FIRST-SWAP ACTIVATION BANNER (new users only) ===== */}
      {firstSwap.showHomeBanner && (
        <div className="px-6 mt-5">
          <FirstSwapBanner
            onCta={() => openRequestFor(undefined, 'first-swap-banner')}
            onDismiss={firstSwap.dismissBanner}
          />
        </div>
      )}

      {/* ===== PRIMARY HERO CTA ===== */}
      <div className="px-6 mt-5">
        <button
          onClick={() => openRequestFor(undefined, 'hero')}
          className="group w-full p-5 rounded-2xl text-primary-foreground flex items-center gap-4 tap-feedback animate-cta-pulse animate-breathe bg-primary"
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Plus size={24} strokeWidth={2.6} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-[17px] leading-tight">Need help with your pet?</p>
            <p className="text-[12px] opacity-90 mt-0.5">Post a request in under 30 seconds</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold opacity-95">
            Get Help Now
            <ArrowRight size={15} className="animate-arrow-nudge" />
          </span>
        </button>
      </div>

      {/* ===== SECONDARY QUICK ACTIONS ===== */}
      <nav className="px-6 mt-4 grid grid-cols-3 gap-2.5" aria-label="Quick actions">
        {[
          {
            key: 'find',
            icon: Search,
            title: 'Find Help',
            sub: 'Browse trusted carers',
            action: () => {
              trackEvent('home_quick_action_tap', 'find');
              haptic('light');
              navigate('/explore');
            },
          },
          {
            key: 'offer',
            icon: HandHeart,
            title: 'Offer Help',
            sub: 'Earn credits nearby',
            action: () => {
              trackEvent('home_quick_action_tap', 'offer');
              haptic('light');
              navigate('/explore');
            },
          },
          {
            key: 'msg',
            icon: MessageCircle,
            title: 'Messages',
            sub: unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}` : 'All caught up',
            badge: unreadMessages,
            action: () => {
              trackEvent('home_quick_action_tap', 'messages');
              haptic('light');
              navigate('/messages');
            },
          },
        ].map(({ key, icon: Icon, title, sub, action, badge }) => (
          <button
            key={key}
            onClick={action}
            className="card-elevated p-3.5 flex flex-col items-start gap-2 text-left tap-feedback relative"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[13px] leading-tight">{title}</p>
              <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-2 break-words">{sub}</p>
            </div>
            {badge ? (
              <span className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* ===== TRUSTED NEARBY RIGHT NOW ===== */}
      <section className="mt-7 animate-fade-in" aria-label="Trusted helpers nearby">
        <div className="px-6 flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h2 className="font-bold text-[17px] leading-tight">Trusted nearby right now</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {onlineCount > 0 ? `${onlineCount} online · ranked by trust` : 'Ranked by trust + recency'}
            </p>
          </div>
          <NearbyDropdown value={radius} onChange={setRadius} />
        </div>

        {trustedHelpers.length === 0 ? (
          <div className="px-6">
            <div className="card-flat p-5 text-center">
              <p className="font-semibold text-[15px] mb-1">
                No helpers within {radius === 0 ? 'your filters' : `${radius} miles`} right now
              </p>
              <p className="text-[12.5px] text-muted-foreground mb-4 max-w-[280px] mx-auto leading-relaxed">
                Try widening your radius or browse trusted helpers nearby.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {radius < 25 && (
                  <button
                    onClick={() => {
                      haptic('light');
                      setRadius(25);
                    }}
                    className="btn-primary py-2 px-4 text-[12.5px]"
                  >
                    Expand to 25 miles
                  </button>
                )}
                <button
                  onClick={() => {
                    haptic('light');
                    setRadius(0);
                  }}
                  className="btn-secondary py-2 px-4 text-[12.5px]"
                >
                  Search anywhere
                </button>
                <button
                  onClick={() => {
                    haptic('light');
                    trackEvent('home_invite_tap', 'empty-state');
                    setInviteOpen(true);
                  }}
                  className="btn-secondary py-2 px-4 text-[12.5px]"
                >
                  Invite neighbours
                </button>
              </div>
            </div>

            {suggestedHelpers.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                  Suggested for you
                </p>
                <div className="flex gap-3 overflow-x-auto -mx-6 px-6 scrollbar-hide pb-1 scroll-rail">
                  {suggestedHelpers.map(user => renderHelperCard(user))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-6 scrollbar-hide pb-1 scroll-rail stagger">
            {trustedHelpers.map(user => renderHelperCard(user))}
          </div>
        )}
      </section>

      {/* ===== DAILY ACTIVITY ===== */}
      <LazySection minHeight={140}>
        <div className="px-6 mt-7">
          <DailyActivityCard
            nearbyHelpersCount={nearbyHelpers.length}
            nearbyRequestsCount={nearbyRequests.length}
          />
        </div>
      </LazySection>

      {/* ===== COMPACT TRUST CARD ===== */}
      <div className="px-6 mt-4">
        <CompactTrustCard breakdown={myTrust} onAction={() => navigate('/profile')} />
      </div>

      {/* ===== TRUSTED COMMUNITY (social proof) ===== */}
      <LazySection minHeight={180}>
        <div className="px-6 mt-4">
          <TrustCommunityCard />
        </div>
      </LazySection>

      {/* ===== Below the fold — deferred for fast first paint ===== */}

      {/* CREDITS */}
      <LazySection minHeight={170}>
        <div className="px-6 mt-4">
          <div className="card-elevated p-5">
            <div className="flex items-baseline justify-between mb-1">
              <p className="font-bold text-[26px] tabular-nums leading-none">
                {creditSummary.balance} <span className="text-[14px] font-semibold text-muted-foreground">credits</span>
              </p>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Wallet</span>
            </div>
            <p className="text-[13px] text-muted-foreground">Help now, get help later.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/explore')}
                className="btn-primary py-2.5 text-[13px]"
              >
                Find Pet Care
              </button>
              <button
                onClick={() => navigate('/credits')}
                className="btn-secondary py-2.5 text-[13px]"
              >
                History
              </button>
            </div>
          </div>
        </div>
      </LazySection>

      {/* MY OPEN REQUESTS — appears once we wire real care_requests for the user */}


      {/* REFERRAL */}
      <LazySection minHeight={140}>
        <div className="px-6 mt-4">
          <button
            onClick={() => {
              trackEvent('home_invite_tap');
              haptic('light');
              setInviteOpen(true);
            }}
            className="card-elevated p-5 w-full flex items-center gap-4 text-left tap-feedback bg-primary/5"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Gift size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] leading-tight">Invite trusted neighbours</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Both earn 2 credits after first swap
              </p>
            </div>
            <span className="btn-primary text-[12px] px-4 py-2">Invite Friends</span>
          </button>
        </div>
      </LazySection>

      {/* PREMIUM */}
      {!isPremium && (
        <LazySection minHeight={220}>
          <div className="px-6 mt-4">
            <div className="card-elevated p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full -translate-y-8 translate-x-8" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Sparkles size={16} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-warning">PetSwap Premium</p>
                    <p className="font-semibold text-[15px] leading-tight">Premium members get help faster</p>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4 text-[13px]">
                  {[
                    'Instant alerts for new requests',
                    'Favourite helper alerts',
                    'Priority placement in search',
                    'Advanced filters',
                  ].map(p => (
                    <li key={p} className="flex items-center gap-2 text-foreground/85">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    trackEvent('subscription_upgrade_tap', 'home');
                    haptic('light');
                    navigate('/subscription');
                  }}
                  className="btn-primary w-full py-3 text-[13px]"
                >
                  Upgrade — £4.99/month
                </button>
              </div>
            </div>
          </div>
        </LazySection>
      )}

      {/* WHY PETSWAP FEELS SAFE */}
      <LazySection minHeight={120}>
        <div className="px-6 mt-4 mb-2">
          <button
            onClick={() => navigate('/safety')}
            className="card-flat p-5 w-full text-left flex items-center gap-4 tap-feedback"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold leading-tight">Why PetSwap feels safe</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Verified profiles, reviews, completed swaps.
              </p>
            </div>
            <ArrowRight size={16} className="text-muted-foreground" />
          </button>
        </div>
      </LazySection>

      {/* Sticky bottom CTA — appears after scrolling past hero */}
      <StickyHelpCta
        onTap={() => {
          trackEvent('home_sticky_cta_tap');
          openRequestFor(undefined, 'sticky');
        }}
      />

      {/* Sheets */}
      <QuickRequestSheet isOpen={requestOpen} onClose={closeRequest} prefillHelperId={requestHelperId} />
      <SuggestNeighboursSheet
        isOpen={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        myUserId={myUserId}
        myPostcode={myPostcode}
        myCoords={myCoords}
        onSendRequest={(helperId) => {
          setSuggestOpen(false);
          // tiny delay so the bottom sheet finishes its close transition
          window.setTimeout(() => openRequestFor(helperId, 'first-swap-suggest'), 250);
        }}
      />
      <InviteSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <BoostSheet
        isOpen={boostOpen}
        onClose={() => setBoostOpen(false)}
        requestId={boostRequestId}
        petName={undefined}
        creditsBalance={creditSummary.balance}
      />

      <PremiumValueToast isPremium={isPremium} />
      <BottomNav />
    </div>
  );
};

export default HomePage;
