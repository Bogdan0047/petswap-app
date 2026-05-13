import React, { useMemo } from 'react';
import { Clock, MapPin, Star, Zap } from 'lucide-react';
import { CareRequest, careTypeLabels, mockUsers, mockPets, type User, type Pet } from '@/data/mockData';
import { getUserAvatar, getPetPhoto } from '@/assets/images';
import { isBoosted, getBoostExpiry, formatBoostRemaining } from '@/lib/boostStore';
import { cn } from '@/lib/utils';

interface RequestCardProps {
  request: CareRequest;
  /** Optional real owner — if not provided, falls back to mock lookup. */
  owner?: User;
  /** Optional real pet — if not provided, falls back to mock lookup. */
  pet?: Pet;
  onRespond?: () => void;
}

type Urgency = 'today' | 'soon' | 'flexible';
const inferUrgency = (startAt: string, flexible?: boolean): Urgency => {
  if (flexible) return 'flexible';
  if (/today|tonight|this evening|in \d+\s?h/i.test(startAt)) return 'today';
  if (/tomorrow|fri|sat|sun|this week|in \d+\s?d/i.test(startAt)) return 'soon';
  return 'flexible';
};

const URGENCY_STYLES: Record<Urgency, { label: string; className: string }> = {
  today: { label: 'Today', className: 'bg-destructive/10 text-destructive' },
  soon: { label: 'Soon', className: 'bg-warning/15 text-warning' },
  flexible: { label: 'Flexible', className: 'bg-primary/10 text-primary' },
};

const RequestCard = React.forwardRef<HTMLDivElement, RequestCardProps>(({ request, owner: ownerProp, pet: petProp, onRespond }, ref) => {
  const creator = ownerProp ?? mockUsers.find(u => u.id === request.creatorId);
  const pet = petProp ?? mockPets.find(p => p.id === request.petId);
  const urgency = useMemo(() => inferUrgency(request.startAt, request.flexibleTiming), [request.startAt, request.flexibleTiming]);

  if (!creator || !pet) return null;


  const creatorAvatar = getUserAvatar(creator.id);
  const petImg = getPetPhoto(pet.id);
  const boosted = isBoosted(request.id);
  const boostExpiry = boosted ? getBoostExpiry(request.id) : null;
  const u = URGENCY_STYLES[urgency];

  return (
    <div ref={ref} className={cn('card-elevated p-5 relative', boosted && 'ring-1 ring-warning/30')}>
      {boosted && (
        <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1 bg-warning text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
          <Zap size={10} /> Boosted{boostExpiry ? ` · ${formatBoostRemaining(boostExpiry)}` : ''}
        </div>
      )}

      {/* Header: owner */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-accent overflow-hidden flex-shrink-0">
          {creatorAvatar ? (
            <img src={creatorAvatar} alt={creator.firstName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">{creator.avatarEmoji}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] truncate">{creator.firstName}</p>
          <p className="text-muted-foreground text-[12px] flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {creator.area} · {creator.distance}
          </p>
        </div>
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', u.className)}>
          {u.label}
        </span>
      </div>

      {/* Pet + service block */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-[14px] bg-surface-muted">
        <div className="w-12 h-12 rounded-[12px] overflow-hidden flex-shrink-0">
          {petImg ? (
            <img src={petImg} alt={pet.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center text-lg">{pet.avatarEmoji}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-tight">
            {careTypeLabels[request.careType]} for {pet.name}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {pet.breed} · {pet.size}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[12.5px] text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {request.startAt}
        </span>
      </div>

      {request.notes && (
        <p className="text-[13px] text-foreground/75 mb-4 line-clamp-2 leading-relaxed">{request.notes}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1 text-[13.5px] font-bold text-warning">
          <Star size={14} fill="currentColor" /> {request.creditsOffered} credit{request.creditsOffered !== 1 ? 's' : ''}
        </span>
        {onRespond && (
          <button onClick={onRespond} className="btn-primary text-[13px] px-5 py-2.5">
            Respond
          </button>
        )}
      </div>
    </div>
  );
});
RequestCard.displayName = 'RequestCard';

export default RequestCard;
