import type { User } from '@/data/mockData';

export type TrustTier = 'low' | 'improving' | 'good' | 'trusted';

export interface TrustBreakdown {
  score: number;
  tier: TrustTier;
  tierLabel: string;
  completion: number;
  components: { label: string; achieved: boolean; weight: number }[];
  nextSteps: { label: string; href?: string }[];
}

const tierFor = (score: number): TrustTier => {
  if (score >= 80) return 'trusted';
  if (score >= 60) return 'good';
  if (score >= 40) return 'improving';
  return 'low';
};

const tierLabels: Record<TrustTier, string> = {
  trusted: 'Trusted member',
  good: 'Good standing',
  improving: 'Improving',
  low: 'New member',
};

/** Mirrors the SQL calculate_trust_score weighting */
export const computeTrust = (u: User): TrustBreakdown => {
  const components = [
    { label: 'Email verified', achieved: u.isEmailVerified, weight: 10 },
    { label: 'Profile photo', achieved: !!u.avatarUrl, weight: 15 },
    { label: 'Location verified', achieved: !!u.isLocationVerified, weight: 15 },
    { label: 'Pet owner verified', achieved: !!u.isPetOwnerVerified, weight: 20 },
    { label: 'Completed swaps', achieved: u.completedSwaps >= 1, weight: u.completedSwaps >= 3 ? 15 : 10 },
    { label: 'Rating 4.5+ with reviews', achieved: u.averageRating >= 4.5 && u.totalReviews >= 1, weight: 15 },
    { label: 'Good response rate', achieved: u.responseRate >= 80 && (u.completedSwaps >= 1 || u.totalReviews >= 1), weight: 10 },
  ];

  const score = Math.min(100, components.reduce((s, c) => s + (c.achieved ? c.weight : 0), 0));
  const tier = tierFor(score);
  const completion = profileCompletion(u);

  const nextSteps = components
    .filter(c => !c.achieved)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(c => ({ label: c.label }));

  return { score, tier, tierLabel: tierLabels[tier], completion, components, nextSteps };
};

export const profileCompletion = (u: User): number => {
  const fields = [
    !!u.firstName,
    !!u.area,
    !!u.bio,
    !!u.avatarEmoji || !!u.avatarUrl,
    !!u.postcode,
    !!u.householdType,
    !!u.petExperience,
    u.isEmailVerified,
    u.isPhoneVerified,
    true, // assumes ≥1 pet/helper profile in mock
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

export const tierClasses = (tier: TrustTier) => {
  // Visual rule (per Trust & Safety spec):
  //   trusted (≥80) → green   |   good (60–79) → green-leaning   |   improving (40–59) → yellow   |   low (<40) → red
  switch (tier) {
    case 'trusted':
      return { ring: 'text-primary', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' };
    case 'good':
      return { ring: 'text-primary', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' };
    case 'improving':
      return { ring: 'text-warning', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' };
    default:
      return { ring: 'text-destructive', bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' };
  }
};
