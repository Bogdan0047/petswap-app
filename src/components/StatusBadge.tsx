import React from 'react';
import { Shield, CheckCircle, Star, Award, Heart, Dog, Cat, Users, Clock, Zap, XCircle, AlertTriangle, MailCheck, Timer, BadgeCheck, MapPin, PawPrint, ShieldCheck, Sparkles, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeType =
  | 'verified' | 'id_checked' | 'top_helper' | 'reliable'
  | 'great_dogs' | 'great_cats' | 'family_friendly' | 'premium'
  | 'new' | 'urgent' | 'completed' | 'pending' | 'cancelled'
  | 'email_verified' | 'fast_responder' | 'profile_complete'
  | 'pet_owner_verified' | 'location_verified' | 'fully_verified' | 'top_trusted';

interface StatusBadgeProps {
  type: BadgeType;
  size?: 'sm' | 'md';
}

type LucideIcon = React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;

const badgeConfig: Record<BadgeType, { icon: LucideIcon; label: string; color: string }> = {
  verified: { icon: CheckCircle, label: 'Photo verified', color: 'bg-primary/10 text-primary' },
  id_checked: { icon: Shield, label: 'Photo verified', color: 'bg-primary/10 text-primary' },
  top_helper: { icon: Award, label: 'Loved by owners', color: 'bg-warning/10 text-warning' },
  reliable: { icon: Star, label: 'Reliable helper', color: 'bg-primary/10 text-primary' },
  great_dogs: { icon: Dog, label: 'Great with dogs', color: 'bg-accent text-accent-foreground' },
  great_cats: { icon: Cat, label: 'Great with cats', color: 'bg-accent text-accent-foreground' },
  family_friendly: { icon: Users, label: 'Family-friendly', color: 'bg-accent text-accent-foreground' },
  premium: { icon: Heart, label: 'Premium', color: 'bg-premium/10 text-premium' },
  new: { icon: Zap, label: 'New', color: 'bg-info/10 text-info' },
  urgent: { icon: AlertTriangle, label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
  completed: { icon: CheckCircle, label: 'Completed', color: 'bg-primary/10 text-primary' },
  pending: { icon: Clock, label: 'Pending', color: 'bg-warning/10 text-warning' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
  email_verified: { icon: MailCheck, label: 'Email verified', color: 'bg-primary/10 text-primary' },
  fast_responder: { icon: Timer, label: 'Fast responder', color: 'bg-info/10 text-info' },
  profile_complete: { icon: BadgeCheck, label: 'Profile complete', color: 'bg-primary/10 text-primary' },
  pet_owner_verified: { icon: PawPrint, label: 'Pet owner verified', color: 'bg-primary/10 text-primary' },
  location_verified: { icon: MapPin, label: 'Location confirmed', color: 'bg-primary/10 text-primary' },
  fully_verified: { icon: ShieldCheck, label: 'Fully verified', color: 'bg-success/12 text-success' },
  top_trusted: { icon: Sparkles, label: 'Loved by owners', color: 'bg-warning/12 text-warning' },
};

const StatusBadge = ({ type, size = 'sm' }: StatusBadgeProps) => {
  const config = badgeConfig[type];
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2.5 py-1 gap-1' : 'text-[12px] px-3 py-1.5 gap-1.5';
  const iconSize = size === 'sm' ? 11 : 13;

  return (
    <span className={cn('inline-flex items-center rounded-full font-semibold', config.color, sizeClasses)}>
      <Icon size={iconSize} />
      {config.label}
    </span>
  );
};

export { StatusBadge };
export default StatusBadge;
