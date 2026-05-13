// Re-export StatusBadge as TrustBadge for backward compatibility
import StatusBadge from './StatusBadge';

export type { default as StatusBadgeProps } from './StatusBadge';

interface TrustBadgeProps {
  type:
    | 'verified'
    | 'id_checked'
    | 'top_helper'
    | 'reliable'
    | 'great_dogs'
    | 'great_cats'
    | 'family_friendly'
    | 'premium'
    | 'pet_owner_verified'
    | 'location_verified'
    | 'fully_verified'
    | 'top_trusted';
  size?: 'sm' | 'md';
}

const TrustBadge = ({ type, size = 'sm' }: TrustBadgeProps) => (
  <StatusBadge type={type} size={size} />
);

export default TrustBadge;
