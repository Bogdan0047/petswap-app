import { MapPin, Star, CheckCircle, Clock, Heart, HandHeart, Zap, PawPrint, Sparkles, ShieldCheck } from 'lucide-react';
import { User, Pet, mockPets } from '@/data/mockData';
import { getPetPhoto } from '@/assets/images';
import TrustBadge from './TrustBadge';
import UserActionsMenu from './UserActionsMenu';
import UserAvatar from './UserAvatar';
import { useFavourite, toggleFavourite } from '@/lib/favouritesStore';
import { trackEvent } from '@/lib/analyticsStore';
import { isActiveNow, estimateResponseTime } from '@/lib/presence';
import { cn } from '@/lib/utils';

interface UserCardProps {
  user: User;
  pet?: Pet;
  compact?: boolean;
  onConnect?: () => void;
  onSave?: () => void;
  onView?: () => void;
  onRequestHelp?: () => void;
}

/** Friendly social-proof tags ("People trust them for…") inferred from profile data — never invented numbers. */
const trustTagsFor = (user: User): string[] => {
  const pets = mockPets.filter(p => p.ownerId === user.id);
  const tags: string[] = [];
  if (pets.some(p => p.type === 'dog')) tags.push('Dog sitting');
  if (pets.some(p => p.type === 'cat')) tags.push('Cat care');
  if (user.availability.daysAvailable.some(d => d === 'Sat' || d === 'Sun')) tags.push('Weekend care');
  if (user.availability.daysAvailable.length >= 5) tags.push('Flexible schedule');
  if (user.hasChildren) tags.push('Friendly with kids');
  if (user.petExperience === 'experienced' || user.petExperience === 'professional' || user.completedSwaps >= 5) tags.push('Experienced');
  return tags.slice(0, 3);
};

/** Friendly bio line — use real bio or generate a warm fallback. */
const bioLineFor = (user: User): string => {
  if (user.bio && user.bio.trim().length > 0) {
    // Trim to one warm line
    const first = user.bio.split(/[.\n]/)[0].trim();
    return first.length > 90 ? first.slice(0, 87).trim() + '…' : first;
  }
  return 'Pet lover nearby — happy to help 🐾';
};

/** Availability micro-tag from user.availability. */
const availabilityTagFor = (user: User): string | null => {
  const days = user.availability?.daysAvailable ?? [];
  if (days.length === 0) return null;
  const weekend = days.some(d => d === 'Sat' || d === 'Sun');
  const weekday = days.some(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d));
  if (days.length >= 5) return 'Flexible schedule';
  if (weekend && !weekday) return 'Available weekends';
  if (weekday && !weekend) return 'Available weekdays';
  return 'Available this week';
};

/** Parse distance like "0.4 mi" → adds warm reinforcement when very close. */
const distanceReinforcement = (distance?: string): string | null => {
  if (!distance) return null;
  const m = distance.match(/([\d.]+)\s*mi/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  if (n <= 0.5) return 'very close to you';
  if (n <= 2) return 'in your neighbourhood';
  if (n <= 5) return 'just a short trip away';
  return null;
};

const UserCard = ({ user, pet, compact, onConnect, onView, onRequestHelp }: UserCardProps) => {
  const userPets = mockPets.filter(p => p.ownerId === user.id);
  const displayPet = pet || userPets[0];
  const petImg = displayPet ? getPetPhoto(displayPet.id) : undefined;
  const [isFav, toggleFav] = useFavourite(user.id);
  const canHelp = user.role !== 'owner';
  const activeNow = isActiveNow(user);
  const replyEta = estimateResponseTime(user.responseRate);
  const fullyVerified = !!user.avatarUrl && user.isEmailVerified && !!user.isPetOwnerVerified && !!user.isLocationVerified;
  const hasAnyVerification = !!user.avatarUrl || user.isEmailVerified || !!user.isPetOwnerVerified || !!user.isLocationVerified;
  const isNewUser = user.totalReviews === 0 && user.completedSwaps === 0;
  const lovedByOwners = user.averageRating >= 4.8 && user.totalReviews >= 3;
  const trustTags = trustTagsFor(user);
  const bioLine = bioLineFor(user);
  const availabilityTag = availabilityTagFor(user);
  const distanceWarmth = distanceReinforcement(user.distance);
  const microTrustLine = fullyVerified
    ? 'Verified, local & trusted member'
    : hasAnyVerification
      ? 'Safe, local, verified member'
      : isNewUser
        ? 'Early member — early connections welcome'
        : 'Local pet lover near you';

  if (compact) {
    return (
      <button onClick={onView} className="card-elevated p-4 w-full text-left flex items-center gap-4 transition-all duration-200 active:scale-[0.98]">
        <div className={cn('relative flex-shrink-0 rounded-full', fullyVerified && 'ring-2 ring-success/30 ring-offset-2 ring-offset-card')}>
          <UserAvatar name={user.firstName} src={user.avatarUrl || undefined} size={52} />
          {activeNow && (
            <span aria-label="Active now" className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success ring-2 ring-card animate-pulse-soft" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[14px] truncate">{user.firstName}</p>
            {fullyVerified && <CheckCircle size={12} className="text-success flex-shrink-0" />}
          </div>
          <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin size={11} />
            <span className="truncate">{user.area || 'Nearby'}</span>
            {user.distance && (
              <>
                <span className="opacity-50">·</span>
                <span className="font-medium text-foreground/70 whitespace-nowrap">{user.distance}</span>
              </>
            )}
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-1 truncate">
            {isNewUser ? (
              <span className="font-semibold text-primary">New on PetSwap · Ready to help</span>
            ) : (
              <>
                {user.completedSwaps > 0 && <span className="font-semibold text-foreground">{user.completedSwaps} swap{user.completedSwaps === 1 ? '' : 's'}</span>}
                {user.completedSwaps > 0 && <span> · </span>}
                <span>Replies {replyEta}</span>
              </>
            )}
          </p>
        </div>
        {user.totalReviews > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-0.5 justify-end text-[13px] font-semibold">
              <Star size={13} className="text-warning" fill="currentColor" /> {user.averageRating.toFixed(1)}
            </div>
            <p className="text-[11px] text-muted-foreground">{user.totalReviews} review{user.totalReviews === 1 ? '' : 's'}</p>
          </div>
        )}
      </button>
    );
  }

  const trustBadgeLabel = fullyVerified
    ? 'Trusted nearby'
    : lovedByOwners
      ? 'Loved locally'
      : user.isLocationVerified
        ? 'Verified neighbour'
        : hasAnyVerification
          ? 'Verified member'
          : isNewUser
            ? 'New nearby'
            : 'Local pet lover';

  return (
    <div
      className={cn(
        'group relative bg-card rounded-[20px] p-5',
        'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)]',
        'ring-1 ring-black/[0.04]',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'active:scale-[0.97] active:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_16px_32px_-12px_rgba(16,24,40,0.18)]',
      )}
    >
      {/* Top: Avatar + identity */}
      <div className="flex items-start gap-3.5 mb-3">
        <div className="relative flex-shrink-0">
          {/* Subtle gradient ring */}
          <div
            className="absolute inset-0 rounded-full -m-[2px] p-[2px]"
            style={{
              background: fullyVerified
                ? 'linear-gradient(135deg, hsl(var(--success)/0.55), hsl(var(--primary)/0.35))'
                : 'linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--muted)/0.6))',
            }}
            aria-hidden
          />
          <div className="relative rounded-full bg-card p-[2px] shadow-[0_4px_12px_-4px_rgba(16,24,40,0.18)]">
            <UserAvatar name={user.firstName} src={user.avatarUrl || undefined} size={60} />
          </div>
          {fullyVerified && (
            <span
              aria-label="Verified"
              className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-success text-success-foreground flex items-center justify-center ring-[2.5px] ring-card"
            >
              <CheckCircle size={11} strokeWidth={2.8} />
            </span>
          )}
          {!fullyVerified && activeNow && (
            <span aria-label="Active now" className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success ring-[2.5px] ring-card animate-pulse-soft" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Name + lock */}
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[17px] tracking-tight text-foreground truncate leading-tight">
              {user.firstName}
            </h3>
            {fullyVerified && <ShieldCheck size={14} className="text-success flex-shrink-0" strokeWidth={2.5} />}
          </div>
          {/* Trust subtitle */}
          <p className="text-[12.5px] text-muted-foreground font-medium mt-0.5 truncate">
            {trustBadgeLabel}
          </p>

          {/* Distance + activity */}
          <div className="flex items-center gap-1.5 mt-2 text-[12px] text-muted-foreground flex-wrap">
            <MapPin size={11} className="flex-shrink-0" />
            {user.distance ? (
              <>
                <span className="font-semibold text-foreground/85">{user.distance} away</span>
                {distanceWarmth && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-primary/85 font-medium">{distanceWarmth.charAt(0).toUpperCase() + distanceWarmth.slice(1)}</span>
                  </>
                )}
              </>
            ) : (
              <span>{user.area || 'Nearby'}</span>
            )}
            {activeNow && (
              <>
                <span className="opacity-40">•</span>
                <span className="text-success font-semibold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" /> Active now
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quiet save action — kept tiny so it doesn't compete */}
        <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1 -mt-1">
          <button
            onClick={() => {
              const nowFav = toggleFavourite(user.id);
              if (nowFav) trackEvent('favourite_added', user.id);
            }}
            aria-label={isFav ? 'Remove from favourites' : 'Save helper'}
            className={cn(
              'p-1.5 rounded-full transition-all duration-200 active:scale-90',
              isFav ? 'text-destructive' : 'text-muted-foreground/70 hover:text-foreground',
            )}
          >
            <Heart size={15} fill={isFav ? 'currentColor' : 'none'} key={isFav ? 'on' : 'off'} className={isFav ? 'animate-heart-pulse' : undefined} />
          </button>
          <UserActionsMenu userId={user.id} userName={user.firstName} />
        </div>
      </div>

      {/* Bio — natural, max 2 lines */}
      <p className="text-[13.5px] text-foreground/80 leading-[1.45] line-clamp-2 mb-3">
        {bioLine}
      </p>

      {/* Availability pill */}
      {availabilityTag && (
        <div className="mb-3.5">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
            <Clock size={11} strokeWidth={2.5} /> {availabilityTag}
          </span>
        </div>
      )}

      {/* Trust micro-line above CTA */}
      <div className="flex items-center justify-center gap-1.5 mb-2.5 text-[11.5px] font-semibold text-muted-foreground">
        <ShieldCheck size={12} className="text-success" strokeWidth={2.5} />
        <span className="text-foreground/70">Safe</span>
        <span className="opacity-40">•</span>
        <span className="text-foreground/70">Local</span>
        <span className="opacity-40">•</span>
        <span className="text-foreground/70">Verified</span>
      </div>

      {/* Premium CTA */}
      <div className="flex flex-col gap-2">
        {onRequestHelp && canHelp ? (
          <button
            onClick={onRequestHelp}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-primary-foreground',
              'rounded-[16px] py-3.5',
              'shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45),inset_0_1px_0_rgba(255,255,255,0.18)]',
              'transition-all duration-200 active:scale-[0.97] active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.55)]',
            )}
            style={{
              background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary-pressed)) 100%)',
            }}
          >
            <HandHeart size={16} strokeWidth={2.4} /> Send request
          </button>
        ) : onConnect ? (
          <button
            onClick={onConnect}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-primary-foreground',
              'rounded-[16px] py-3.5',
              'shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45),inset_0_1px_0_rgba(255,255,255,0.18)]',
              'transition-all duration-200 active:scale-[0.97]',
            )}
            style={{
              background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary-pressed)) 100%)',
            }}
          >
            Message
          </button>
        ) : onView ? (
          <button onClick={onView} className="w-full btn-outline text-[14px] py-3 rounded-[16px]">
            View profile
          </button>
        ) : null}

        {((onRequestHelp && canHelp) || onConnect) && (
          <p className="text-[11.5px] text-center text-muted-foreground leading-snug">
            No payment — just pet swaps
          </p>
        )}
      </div>
    </div>
  );
};

export default UserCard;
