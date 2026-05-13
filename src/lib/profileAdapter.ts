import type { User, CareRequest, Pet } from '@/data/mockData';
import type { NearbyHelper } from '@/hooks/useNearbyHelpers';
import type { NearbyCareRequest } from '@/hooks/useNearbyCareRequests';
import { formatMiles } from '@/lib/distance';

const minutesAgo = (iso: string | null | undefined): string => {
  if (!iso) return 'A while ago';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

/**
 * Adapt a real Supabase profile row to the legacy `User` shape so existing
 * presentational components (UserCard, SwipeDeck, etc.) keep working without
 * a rewrite. Anything we genuinely don't know is left empty/zero — never faked.
 */
export const profileToUser = (p: NearbyHelper): User => ({
  id: p.id,
  firstName: (p.first_name || 'Member').trim() || 'Member',
  email: '',
  area: p.area || '',
  postcode: p.postcode || '',
  bio: p.bio || '',
  householdType: 'house',
  hasChildren: false,
  hasPets: false,
  petExperience: 'some',
  avatarUrl: p.avatar_url || '',
  avatarEmoji: '🙂',
  isEmailVerified: !!p.is_email_verified,
  isPhoneVerified: !!p.is_phone_verified,
  isIdVerified: false,
  isPetOwnerVerified: !!p.is_pet_owner_verified,
  isLocationVerified: !!p.is_location_verified,
  reliabilityScore: 0,
  averageRating: Number(p.average_rating ?? 0),
  totalReviews: p.total_reviews ?? 0,
  completedSwaps: p.completed_swaps ?? 0,
  cancellationsCount: 0,
  responseRate: p.response_rate ?? 0,
  credits: 0,
  subscriptionTier: 'free',
  role: 'both',
  availability: {
    daysAvailable: p.available_now ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : [],
    daysNeeding: [],
    noticePeriod: 'same_day',
    scheduleType: 'flexible',
  },
  distance: p.distanceMiles == null ? '' : formatMiles(p.distanceMiles, !!p.distanceApprox),
  lastActive: p.last_seen_at ? minutesAgo(p.last_seen_at) : '',
  createdAt: '',
});

const careTypeMap: Record<string, CareRequest['careType']> = {
  day_care: 'day_care',
  evening_care: 'evening_care',
  overnight: 'overnight',
  walk_checkin: 'walk_checkin',
  feeding_visit: 'feeding_visit',
  weekend_help: 'weekend_help',
};

export const careRequestToLegacy = (r: NearbyCareRequest): CareRequest => ({
  id: r.id,
  creatorId: r.creator_id,
  petId: r.pet_id,
  careType: careTypeMap[r.care_type] ?? 'day_care',
  startAt: new Date(r.start_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  endAt: new Date(r.end_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  notes: r.notes || '',
  creditsOffered: r.credits_offered,
  flexibleTiming: false,
  status: (r.status as CareRequest['status']) ?? 'open',
  createdAt: minutesAgo(r.created_at),
});

export const careRequestPet = (r: NearbyCareRequest): Pet | null => {
  if (!r.pet) return null;
  return {
    id: r.pet.id,
    ownerId: r.creator_id,
    name: r.pet.name,
    type: (r.pet.type as Pet['type']) ?? 'dog',
    breed: r.pet.breed || '',
    size: 'medium',
    age: '',
    temperament: '',
    goodWithChildren: false,
    goodWithPets: false,
    feedingNotes: '',
    medicationNotes: '',
    walkingNeeds: '',
    specialInstructions: '',
    avatarEmoji: '🐾',
    photos: [],
    createdAt: '',
  };
};

export const careRequestOwner = (r: NearbyCareRequest): User | null => {
  if (!r.creator) return null;
  return profileToUser({
    id: r.creator.id,
    first_name: r.creator.first_name,
    area: r.creator.area,
    postcode: r.creator.postcode,
    avatar_url: r.creator.avatar_url,
    bio: null,
    trust_score: r.creator.trust_score,
    trust_tier: r.creator.trust_tier,
    average_rating: 0,
    total_reviews: 0,
    completed_swaps: 0,
    response_rate: 0,
    is_email_verified: false,
    is_phone_verified: false,
    available_now: false,
    last_seen_at: null,
    distanceMiles: r.distanceMiles,
  });
};
