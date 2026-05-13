import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Plus, ArrowUpDown, Users, WifiOff, Sparkles, UserPlus, Globe2 } from 'lucide-react';
import InviteSheet from '@/components/InviteSheet';
import { SkeletonMatchCard } from '@/components/Skeleton';
import type { User } from '@/data/mockData';
import UserCard from '@/components/UserCard';
import RequestCard from '@/components/RequestCard';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import SegmentedControl from '@/components/SegmentedControl';
import FilterChip from '@/components/FilterChip';
import IconButton from '@/components/IconButton';
import RadiusFilter from '@/components/RadiusFilter';
import QuickRequestSheet from '@/components/QuickRequestSheet';
import ExploreFiltersSheet, { EMPTY_FILTERS, type ExploreFilters } from '@/components/ExploreFiltersSheet';
import SwipeDeck from '@/components/SwipeDeck';
import ExploreIllustration from '@/components/ExploreIllustration';
import LocationPrompt from '@/components/LocationPrompt';
import { useBlockedIds } from '@/lib/blockStore';
import { type RadiusMiles } from '@/lib/distance';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useNearbyHelpers } from '@/hooks/useNearbyHelpers';
import { useNearbyCareRequests } from '@/hooks/useNearbyCareRequests';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useUserLocation } from '@/hooks/useUserLocation';
import { profileToUser, careRequestToLegacy, careRequestPet, careRequestOwner } from '@/lib/profileAdapter';
import { toggleFavourite } from '@/lib/favouritesStore';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { canMatchToday, incrementDailyMatches } from '@/lib/monetization';
import { openPaywall } from '@/lib/paywallStore';

type ViewMode = 'helpers' | 'requests' | 'swipe';
const viewOptions: { id: ViewMode; label: string }[] = [
  { id: 'helpers', label: 'Helpers' },
  { id: 'requests', label: 'Requests' },
  { id: 'swipe', label: 'Swipe' },
];

type SortMode = 'best' | 'distance' | 'recent';
const sortOptions: { id: SortMode; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'distance', label: 'Nearest' },
  { id: 'recent', label: 'Active now' },
];

type Urgency = 'any' | 'today' | 'week';
const urgencyOptions: { id: Urgency; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
];

const Discover = () => {
  const [view, setView] = useState<ViewMode>('helpers');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [radius, setRadius] = useState<RadiusMiles>(10);
  const [sort, setSort] = useState<SortMode>('best');
  const [urgency, setUrgency] = useState<Urgency>('any');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestHelperId, setRequestHelperId] = useState<string | undefined>(undefined);
  const online = useOnlineStatus();
  const [inviteOpen, setInviteOpen] = useState(false);

  const myUserId = useCurrentUserId();
  const { profile: myProfile } = useMyProfile(myUserId);
  const myPostcode = myProfile?.postcode ?? null;
  const myArea = myProfile?.area ?? '';
  const blockedIds = useBlockedIds();
  const { coords: myCoords, refresh: refreshLocation } = useUserLocation(myUserId);

  // Reload Explore when the user grants/updates location.
  useEffect(() => {
    const onLoc = () => refreshLocation();
    window.addEventListener('petswap:location-updated', onLoc);
    return () => window.removeEventListener('petswap:location-updated', onLoc);
  }, [refreshLocation]);

  const { helpers: nearbyHelpers, allHelpers, loading: helpersLoading } = useNearbyHelpers({
    myPostcode,
    myCoords,
    myUserId,
    radius,
    limit: 50,
    blockedIds,
  });

  const { requests: nearbyRequests, loading: requestsLoading } = useNearbyCareRequests({
    myPostcode,
    myCoords,
    myUserId,
    radius,
    limit: 50,
    blockedIds,
    excludeMine: true,
  });

  const { isTrustedPlus } = useSubscription();

  const gateMatchOrPaywall = async (): Promise<boolean> => {
    const { allowed, count, limit } = await canMatchToday(isTrustedPlus);
    if (!allowed) {
      openPaywall({
        trigger: 'match_limit',
        headline: `You've used ${count}/${limit} free matches today`,
        sub: 'Upgrade to Trusted Plus for unlimited matches and priority visibility.',
      });
      return false;
    }
    void incrementDailyMatches();
    return true;
  };

  const openRequestFor = (helperId?: string) => {
    haptic('light');
    setRequestHelperId(helperId);
    setRequestOpen(true);
  };
  const closeRequest = () => {
    setRequestOpen(false);
    setTimeout(() => setRequestHelperId(undefined), 320);
  };

  // Apply trust-based premium filters (we only filter on what we genuinely know).
  const matchesFilters = (h: typeof nearbyHelpers[number], f: ExploreFilters): boolean => {
    if (f.trust.includes('Verified only') && !(h.is_email_verified && h.is_phone_verified)) return false;
    if (f.trust.includes('Trust 80+') && h.trust_score < 80) return false;
    if (f.trust.includes('Fast responders') && h.response_rate < 90) return false;
    return true;
  };

  const isHelperActiveNow = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 10 * 60_000;
  };

  const helpers: User[] = useMemo(() => {
    const ranked = [...nearbyHelpers]
      .filter((h) => matchesFilters(h, filters))
      .sort((a, b) => {
        if (sort === 'distance') return (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999);
        if (sort === 'recent') {
          const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
          const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
          return bt - at;
        }
        // 'best' = trust-first signal stack: verified → active → near → fast
        const aVer = (a.is_email_verified ? 1 : 0) + (a.is_location_verified ? 1 : 0) + (a.is_pet_owner_verified ? 1 : 0) + (a.avatar_url ? 1 : 0);
        const bVer = (b.is_email_verified ? 1 : 0) + (b.is_location_verified ? 1 : 0) + (b.is_pet_owner_verified ? 1 : 0) + (b.avatar_url ? 1 : 0);
        if (aVer !== bVer) return bVer - aVer;
        const aAct = isHelperActiveNow(a.last_seen_at) ? 1 : 0;
        const bAct = isHelperActiveNow(b.last_seen_at) ? 1 : 0;
        if (aAct !== bAct) return bAct - aAct;
        const ad = a.distanceMiles ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceMiles ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return (b.response_rate ?? 0) - (a.response_rate ?? 0);
      });
    return ranked.map(profileToUser);
  }, [nearbyHelpers, sort, filters]);

  const swipeUsers: User[] = useMemo(
    () => nearbyHelpers.filter((h) => matchesFilters(h, filters)).map(profileToUser),
    [nearbyHelpers, filters],
  );

  const filteredRequests = useMemo(() => {
    return nearbyRequests.filter((r) => {
      if (urgency === 'any') return true;
      const start = new Date(r.start_at);
      const now = new Date();
      const diffH = (start.getTime() - now.getTime()) / 36e5;
      if (urgency === 'today') return diffH >= 0 && diffH <= 24;
      if (urgency === 'week') return diffH >= 0 && diffH <= 24 * 7;
      return true;
    });
  }, [nearbyRequests, urgency]);

  const activeNowCount = nearbyHelpers.filter((h) => isHelperActiveNow(h.last_seen_at)).length;
  const totalFilterCount = Object.values(filters).reduce((s, a) => s + a.length, 0);

  // Reset to page top on view change for a tidy feel
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  const liveCount = view === 'requests' ? filteredRequests.length : view === 'swipe' ? swipeUsers.length : helpers.length;
  const liveNoun = view === 'requests' ? 'requests' : 'helpers';

  // No location → first-class prompt; never invent distances
  const needsLocation = !myCoords && !myPostcode && allHelpers.length > 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Offline banner */}
      {!online && (
        <div className="bg-destructive/10 text-destructive text-[12px] font-semibold py-2 px-6 flex items-center gap-2 justify-center safe-top">
          <WifiOff size={13} /> You're offline — showing cached results
        </div>
      )}

      {/* Header */}
      <div className={cn('px-5 pt-7 pb-3', online && 'safe-top')}>
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0 pr-3">
            <h1 className="text-[26px] font-bold tracking-tight leading-tight">
              {(myProfile?.completed_swaps ?? 0) > 0
                ? 'Your trusted community nearby'
                : 'Find trusted pet lovers near you 🐾'}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5 truncate">
              {myArea ? `Verified neighbours in ${myArea}, ready to help` : 'Verified neighbours ready to help'}
            </p>
          </div>
          <div className="relative flex-shrink-0">
            <IconButton
              icon={<SlidersHorizontal size={20} />}
              variant={totalFilterCount > 0 ? 'primary' : 'neutral'}
              onPress={() => setShowFilters(true)}
              label="Filters"
            />
            {totalFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                {totalFilterCount}
              </span>
            )}
          </div>
        </div>
        <SegmentedControl options={viewOptions} value={view} onChange={(v) => setView(v as ViewMode)} />
      </div>

      {/* Optional location prompt */}
      {needsLocation && (
        <div className="px-5 mt-3">
          <LocationPrompt inline />
        </div>
      )}

      {/* Mode-aware controls */}
      <div className="px-5 mt-4 space-y-3">
        <RadiusFilter value={radius} onChange={setRadius} />

        {view === 'helpers' && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            <ArrowUpDown size={13} className="text-muted-foreground flex-shrink-0" />
            {sortOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { haptic('light'); setSort(opt.id); }}
                className={cn(
                  'text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all duration-fast active:scale-[0.96] flex-shrink-0',
                  sort === opt.id ? 'bg-foreground text-background shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {view === 'requests' && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {urgencyOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { haptic('light'); setUrgency(opt.id); }}
                className={cn(
                  'text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all duration-fast active:scale-[0.96] flex-shrink-0',
                  urgency === opt.id ? 'bg-foreground text-background shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {totalFilterCount > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {Object.entries(filters).flatMap(([key, arr]) =>
              arr.map((label) => (
                <FilterChip
                  key={`${key}-${label}`}
                  label={label}
                  selected
                  removable
                  onRemove={() => {
                    haptic('light');
                    setFilters((prev) => ({ ...prev, [key]: ((prev as unknown as Record<string, string[]>)[key] || []).filter((x: string) => x !== label) }));
                  }}
                />
              )),
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 mt-5">
        {view === 'helpers' && (
          <HelpersView
            helpers={helpers}
            activeNowCount={activeNowCount}
            radius={radius}
            loading={helpersLoading}
            onExpand={() => setRadius(radius >= 25 ? 0 : 25)}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
            onPostRequest={() => setRequestOpen(true)}
            onRequest={openRequestFor}
            hasFilters={totalFilterCount > 0}
            onInvite={() => setInviteOpen(true)}
          />
        )}

        {view === 'requests' && (
          <RequestsView
            requests={filteredRequests}
            radius={radius}
            loading={requestsLoading}
            onPostRequest={() => setRequestOpen(true)}
            onExpand={() => setRadius(radius >= 25 ? 0 : 25)}
          />
        )}

        {view === 'swipe' && (
          <SwipeView
            users={swipeUsers}
            radius={radius}
            onExpand={() => setRadius(radius >= 25 ? 0 : 25)}
            onRequest={async (u) => {
              const ok = await gateMatchOrPaywall();
              if (!ok) return;
              void import('@/lib/streaks').then(({ recordStreakActivity }) =>
                recordStreakActivity('match_swipe').then(() =>
                  window.dispatchEvent(new CustomEvent('petswap:streak-changed')),
                ),
              );
              openRequestFor(u.id);
            }}
            onSave={(u) => {
              void import('@/lib/streaks').then(({ recordStreakActivity }) =>
                recordStreakActivity('match_swipe'),
              );
              toggleFavourite(u.id);
            }}
          />
        )}
      </div>

      <ExploreFiltersSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        value={filters}
        onChange={setFilters}
        resultCount={liveCount}
        noun={liveNoun}
      />
      <QuickRequestSheet isOpen={requestOpen} onClose={closeRequest} prefillHelperId={requestHelperId} />
      <InviteSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <BottomNav />
    </div>
  );
};

// ---------------- Sub-views ----------------

interface HelpersViewProps {
  helpers: User[];
  activeNowCount: number;
  radius: RadiusMiles;
  loading: boolean;
  onExpand: () => void;
  onClearFilters: () => void;
  onPostRequest: () => void;
  onRequest: (helperId: string) => void;
  hasFilters: boolean;
  onInvite: () => void;
}

const HelpersView = ({ helpers, activeNowCount, radius, loading, onExpand, onClearFilters, onPostRequest, onRequest, hasFilters, onInvite }: HelpersViewProps) => {
  const fewResults = !loading && helpers.length > 0 && helpers.length <= 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[12px] text-muted-foreground font-semibold">
            {loading ? 'Finding trusted helpers…' : `${helpers.length} trusted helper${helpers.length === 1 ? '' : 's'} nearby`}
          </p>
          {!loading && helpers.length > 0 && (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Verified neighbours · Reviewed by real owners
            </p>
          )}
        </div>
        {activeNowCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            {activeNowCount} active now
          </span>
        )}
      </div>

      {/* Loading skeletons — first 5 fast, rest lazy via list rendering */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonMatchCard key={i} className="animate-fade-in" />
          ))}
        </div>
      )}

      {!loading && helpers.length === 0 ? (
        <div className="card-elevated p-6 text-center animate-fade-in bg-gradient-to-br from-primary/5 to-transparent">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={26} className="text-primary" />
          </div>
          <h3 className="text-[18px] font-bold tracking-tight mb-1.5">You're early in your area 🚀</h3>
          <p className="text-[13.5px] text-muted-foreground mb-5 max-w-[300px] mx-auto leading-relaxed">
            Be the first to build your trusted circle. Invite a neighbour or widen your search to meet helpers nearby.
          </p>
          <div className="flex flex-col gap-2 max-w-[280px] mx-auto">
            <button
              onClick={onInvite}
              className="btn-primary text-[14px] py-3 inline-flex items-center justify-center gap-1.5"
            >
              <UserPlus size={15} /> Invite neighbours
            </button>
            <button
              onClick={onExpand}
              className="text-[13px] font-semibold py-2.5 rounded-full bg-muted text-foreground/80 hover:bg-muted/80 transition-colors active:scale-[0.97] inline-flex items-center justify-center gap-1.5"
            >
              <Globe2 size={14} /> {radius >= 25 ? 'Show all distances' : 'Expand to 25 mi'}
            </button>
            {hasFilters && (
              <button
                onClick={onClearFilters}
                className="text-[12px] font-semibold py-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-5 text-[11px] text-muted-foreground/80 max-w-[260px] mx-auto leading-relaxed">
            Every member is reviewed and verified before joining PetSwap.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 stagger">
            {helpers.map((user) => (
              <UserCard key={user.id} user={user} onView={() => onRequest(user.id)} onRequestHelp={() => onRequest(user.id)} />
            ))}
          </div>
          {/* Smart "few results" booster */}
          {fewResults && (
            <div className="card-elevated p-4 mt-2 flex items-center gap-3 bg-primary/5 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13.5px]">You're early in your area 🚀</p>
                <p className="text-[12px] text-muted-foreground">Invite a neighbour to grow your trusted circle.</p>
              </div>
              <button
                onClick={onInvite}
                className="text-[12px] font-bold text-primary px-3 py-1.5 rounded-full bg-card ring-1 ring-primary/20 active:scale-[0.97] transition-transform flex-shrink-0"
              >
                Invite
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface RequestsViewProps {
  requests: ReturnType<typeof useNearbyCareRequests>['requests'];
  radius: RadiusMiles;
  loading: boolean;
  onPostRequest: () => void;
  onExpand: () => void;
}

const RequestsView = ({ requests, radius, loading, onPostRequest, onExpand }: RequestsViewProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-[12px] text-muted-foreground font-semibold">
        {loading ? 'Loading nearby requests…' : `${requests.length} owner${requests.length === 1 ? '' : 's'} need help nearby`}
      </p>
      <Users size={14} className="text-primary" />
    </div>
    <button
      onClick={onPostRequest}
      className="card-flat w-full p-4 flex items-center gap-3 transition-all duration-fast active:scale-[0.99] border-2 border-dashed border-border"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Plus size={18} className="text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-semibold text-[14px]">Need help yourself?</p>
        <p className="text-[12px] text-muted-foreground">Post a request in under 30 seconds</p>
      </div>
    </button>
    {!loading && requests.length === 0 ? (
      <EmptyState
        illustration={<ExploreIllustration variant="no-requests" />}
        title="Quiet right now"
        description="Be first to request help nearby. Trusted helpers get notified instantly."
        actionLabel="Post a request"
        onAction={onPostRequest}
        secondaryActions={[
          { label: radius >= 25 ? 'Show all distances' : 'Expand to 25 mi', onClick: onExpand },
        ]}
      />
    ) : (
      <div className="space-y-3 stagger">
        {requests.map((req) => {
          const legacy = careRequestToLegacy(req);
          const owner = careRequestOwner(req);
          const pet = careRequestPet(req);
          return <RequestCard key={req.id} request={legacy} owner={owner ?? undefined} pet={pet ?? undefined} onRespond={() => {}} />;
        })}
      </div>
    )}
  </div>
);

interface SwipeViewProps {
  users: User[];
  radius: RadiusMiles;
  onExpand: () => void;
  onRequest: (u: User) => void;
  onSave: (u: User) => void;
}

const SwipeView = ({ users, radius, onExpand, onRequest, onSave }: SwipeViewProps) => {
  const [exhausted, setExhausted] = useState(false);

  if (users.length === 0 || exhausted) {
    return (
      <EmptyState
        illustration={<ExploreIllustration variant="all-seen" />}
        title="You're all caught up"
        description="We'll notify you the moment new helpers join nearby."
        actionLabel={radius >= 25 ? 'Show all distances' : 'Expand to 25 mi'}
        onAction={onExpand}
        trustNote="Every member is reviewed and verified before joining PetSwap."
      />
    );
  }

  return <SwipeDeck users={users} onRequest={onRequest} onSave={onSave} onExhausted={() => setExhausted(true)} />;
};

export default Discover;
