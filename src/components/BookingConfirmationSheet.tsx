import { useMemo, useState } from 'react';
import { Check, CalendarDays, ClipboardList, MessageCircle, ShieldCheck, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import {
  mockUsers,
  mockPets,
  careTypeLabels,
  type CareRequest,
} from '@/data/mockData';
import { getPetPhoto, getUserAvatar } from '@/assets/images';
import {
  acceptRequest,
  markBookingCompleted,
  updateChecklist,
  useInbox,
  type BookingRecord,
} from '@/lib/inboxStore';
import { trackHelperIntent } from '@/lib/personalizationStore';
import { trackEvent } from '@/lib/analyticsStore';
import { cn } from '@/lib/utils';

interface BookingConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  request: CareRequest | null;
}

interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
}

const HANDOVER_CHECKLIST: ChecklistItem[] = [
  { key: 'keys', label: 'Keys / access confirmed', hint: 'Door code, key handover or lockbox.' },
  { key: 'food', label: 'Food and treats located', hint: 'Know where food and water bowls live.' },
  { key: 'walks', label: 'Walk route agreed', hint: 'Lead, harness, and walking spot confirmed.' },
  { key: 'meds', label: 'Medications noted', hint: 'Doses, timing and storage spot confirmed.' },
  { key: 'emergency', label: 'Emergency contact saved', hint: 'Vet number and backup contact in your phone.' },
];

const BookingConfirmationSheet = ({ isOpen, onClose, request }: BookingConfirmationSheetProps) => {
  const navigate = useNavigate();
  const inbox = useInbox();
  const [confirmed, setConfirmed] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const owner = useMemo(
    () => (request ? mockUsers.find(u => u.id === request.creatorId) : undefined),
    [request],
  );
  const pet = useMemo(
    () => (request ? mockPets.find(p => p.id === request.petId) : undefined),
    [request],
  );
  const booking: BookingRecord | undefined = request ? inbox.bookings[request.id] : undefined;
  const status = request ? inbox.status[request.id] : undefined;

  if (!request || !owner || !pet) return null;

  const ownerAvatar = getUserAvatar(owner.id);
  const petImg = getPetPhoto(pet.id);

  const completedItems = HANDOVER_CHECKLIST.filter(
    item => booking?.checklist?.[item.key],
  ).length;

  const handleAccept = () => {
    acceptRequest({
      requestId: request.id,
      ownerId: owner.id,
      petId: pet.id,
      startAt: request.startAt,
      notes: request.notes,
    });
    trackHelperIntent();
    trackEvent('helper_accepted', request.id);
    setConfirmed(true);
    toast.success('Booking confirmed', {
      description: `You'll care for ${pet.name} on ${request.startAt}.`,
    });
  };

  const toggleItem = (key: string) => {
    const next = !booking?.checklist?.[key];
    updateChecklist(request.id, key, next);
  };

  const handleComplete = () => {
    markBookingCompleted(request.id);
    trackEvent('booking_completed', request.id);
    toast.success('Marked as completed', {
      description: `${request.creditsOffered} credit${
        request.creditsOffered === 1 ? '' : 's'
      } will be added once ${owner.firstName} confirms.`,
    });
    setTimeout(onClose, 600);
  };

  const handleMessage = () => {
    onClose();
    setTimeout(() => navigate('/messages'), 200);
  };

  const isAcceptedFlow = status === 'accepted' || confirmed;
  const isCompleted = booking?.status === 'completed';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">
          {isCompleted
            ? 'Booking complete'
            : isAcceptedFlow
              ? 'Booking confirmed'
              : 'Confirm booking'}
        </p>
        <h3 className="font-bold text-[18px]">
          {pet.name} · {careTypeLabels[request.careType]}
        </h3>
      </div>

      {/* Owner + pet recap */}
      <div className="card-flat p-3 mb-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-accent overflow-hidden flex-shrink-0">
          {ownerAvatar ? (
            <img src={ownerAvatar} alt={owner.firstName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {owner.avatarEmoji}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[14px] truncate">{owner.firstName}</p>
            {owner.isIdVerified && <ShieldCheck size={12} className="text-primary" />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {owner.area} · {owner.distance}
          </p>
        </div>
        <div className="w-11 h-11 rounded-md overflow-hidden bg-accent flex-shrink-0">
          {petImg ? (
            <img src={petImg} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {pet.avatarEmoji}
            </div>
          )}
        </div>
      </div>

      {/* Date + credit */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="card-flat p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
            <CalendarDays size={12} /> When
          </div>
          <p className="font-semibold text-[13px]">{request.startAt}</p>
          {request.flexibleTiming && (
            <p className="text-[10.5px] text-primary font-semibold mt-0.5">Flexible timing</p>
          )}
        </div>
        <div className="card-flat p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
            <Star size={12} /> Earning
          </div>
          <p className="font-semibold text-[13px]">
            {request.creditsOffered} credit{request.creditsOffered === 1 ? '' : 's'}
          </p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">Settled on completion</p>
        </div>
      </div>

      {/* Care notes */}
      {request.notes && (
        <div className="card-flat p-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
            Care notes
          </p>
          <p className="text-[13px] leading-relaxed">{request.notes}</p>
        </div>
      )}

      {/* Pet quick-info */}
      <div className="card-flat p-3 mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Quick pet brief
        </p>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px]">
          <span className="text-muted-foreground">Feeding</span>
          <span className="text-right">{pet.feedingNotes || '—'}</span>
          <span className="text-muted-foreground">Walking</span>
          <span className="text-right">{pet.walkingNeeds || '—'}</span>
          <span className="text-muted-foreground">Medication</span>
          <span className="text-right">{pet.medicationNotes || 'None'}</span>
        </div>
      </div>

      {/* Handover checklist (only after acceptance) */}
      {isAcceptedFlow && !isCompleted && (
        <div className="mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-primary" />
              <p className="text-[13px] font-bold">Handover checklist</p>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {completedItems} / {HANDOVER_CHECKLIST.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {HANDOVER_CHECKLIST.map(item => {
              const done = !!booking?.checklist?.[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleItem(item.key)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-md border transition-all duration-fast text-left active:scale-[0.99]',
                    done
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-surface border-border-light',
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors',
                      done ? 'border-primary bg-primary' : 'border-border',
                    )}
                  >
                    {done && <Check size={12} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-[13px] font-semibold',
                        done && 'text-foreground/70 line-through',
                      )}
                    >
                      {item.label}
                    </p>
                    {item.hint && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      {isCompleted ? (
        <div className="text-center py-2 animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Check size={22} className="text-primary" />
          </div>
          <p className="font-bold text-[15px]">Care completed</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Credits will appear in your wallet once {owner.firstName} confirms.
          </p>
        </div>
      ) : isAcceptedFlow ? (
        <div className="flex gap-2">
          <button
            onClick={handleMessage}
            className="btn-outline flex-1 text-[14px] py-3 inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle size={14} /> Message
          </button>
          <button onClick={handleComplete} className="btn-primary flex-1 text-[14px] py-3">
            Mark completed
          </button>
        </div>
      ) : (
        <>
          {/* Responsibility agreement — psychological commitment, GDPR-friendly record */}
          <button
            type="button"
            onClick={() => setAgreed((v) => !v)}
            className={cn(
              'w-full flex items-start gap-3 p-3 mb-3 rounded-xl border text-left transition-colors',
              agreed ? 'bg-primary/5 border-primary/30' : 'bg-surface border-border-light',
            )}
            aria-pressed={agreed}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors',
                agreed ? 'border-primary bg-primary' : 'border-border',
              )}
            >
              {agreed && <Check size={12} className="text-primary-foreground" />}
            </span>
            <span className="flex-1">
              <p className="text-[13px] font-semibold leading-snug">
                I agree to take care of {pet.name} responsibly
              </p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Follow {owner.firstName}'s care notes, treat their home with respect, and reach out if anything changes.
              </p>
            </span>
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-outline flex-1 text-[14px] py-3">
              Not now
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed}
              className="btn-primary flex-1 text-[14px] py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm booking
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
};

export default BookingConfirmationSheet;
