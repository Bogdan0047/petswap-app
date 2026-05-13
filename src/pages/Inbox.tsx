import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Clock, Star, Check, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { careTypeLabels, type CareRequest } from '@/data/mockData';
import BottomNav from '@/components/BottomNav';
import EmptyState from '@/components/EmptyState';
import SegmentedControl from '@/components/SegmentedControl';
import StatusBadge from '@/components/StatusBadge';
import BookingConfirmationSheet from '@/components/BookingConfirmationSheet';
import UserAvatar from '@/components/UserAvatar';
import LocationPrompt from '@/components/LocationPrompt';
import { useBlockedIds } from '@/lib/blockStore';
import { declineRequest, isUrgent, useInbox } from '@/lib/inboxStore';
import { useNearbyCareRequests } from '@/hooks/useNearbyCareRequests';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { useMyProfile } from '@/hooks/useMyProfile';
import { careRequestToLegacy } from '@/lib/profileAdapter';
import { cn } from '@/lib/utils';

type Tab = 'new' | 'accepted' | 'history';

const tabOptions: { id: Tab; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'history', label: 'History' },
];

const Inbox = () => {
  const navigate = useNavigate();
  const blockedIds = useBlockedIds();
  const inbox = useInbox();
  const [tab, setTab] = useState<Tab>('new');
  const [activeRequest, setActiveRequest] = useState<CareRequest | null>(null);

  const myUserId = useCurrentUserId();
  const { profile: myProfile } = useMyProfile(myUserId);
  const myPostcode = myProfile?.postcode ?? null;

  const { requests: nearbyRequests, loading } = useNearbyCareRequests({
    myPostcode,
    myUserId,
    radius: 25,
    limit: 50,
    blockedIds,
    excludeMine: true,
  });

  const newRequests = useMemo(
    () => nearbyRequests
      .filter((r) => !inbox.status[r.id] || inbox.status[r.id] === 'pending')
      .sort((a, b) => {
        const la = careRequestToLegacy(a);
        const lb = careRequestToLegacy(b);
        const ua = isUrgent(la.startAt, la.createdAt) ? 1 : 0;
        const ub = isUrgent(lb.startAt, lb.createdAt) ? 1 : 0;
        return ub - ua;
      }),
    [nearbyRequests, inbox.status],
  );

  const acceptedRequests = useMemo(
    () => nearbyRequests.filter((r) => inbox.status[r.id] === 'accepted' && inbox.bookings[r.id]?.status !== 'completed'),
    [nearbyRequests, inbox],
  );

  const historyRequests = useMemo(
    () => nearbyRequests.filter((r) => inbox.status[r.id] === 'declined' || inbox.bookings[r.id]?.status === 'completed'),
    [nearbyRequests, inbox],
  );

  const urgentCount = newRequests.filter((r) => {
    const l = careRequestToLegacy(r);
    return isUrgent(l.startAt, l.createdAt);
  }).length;

  const handleDecline = (req: CareRequest) => {
    declineRequest(req.id);
    toast('Request declined', { description: `We won't show this request again.` });
  };

  const renderRequestCard = (raw: typeof nearbyRequests[number], mode: 'new' | 'accepted' | 'history') => {
    const legacy = careRequestToLegacy(raw);
    const ownerName = (raw.creator?.first_name || 'Member').trim() || 'Member';
    const ownerAvatar = raw.creator?.avatar_url || undefined;
    const petName = raw.pet?.name ?? 'Pet';
    const urgent = isUrgent(legacy.startAt, legacy.createdAt);
    const booking = inbox.bookings[raw.id];
    const isCompleted = booking?.status === 'completed';
    const isDeclined = inbox.status[raw.id] === 'declined';
    const distLabel = raw.distanceMiles == null ? (raw.creator?.area || 'Nearby') : `${raw.distanceMiles < 1 ? '<1' : Math.round(raw.distanceMiles)} mi`;

    return (
      <div
        key={raw.id}
        className={cn('card-elevated p-4 animate-fade-in', urgent && mode === 'new' && 'ring-2 ring-warning/40')}
      >
        <div className="flex items-start gap-3 mb-3">
          <UserAvatar name={ownerName} src={ownerAvatar} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[14px] truncate">{ownerName}</p>
              <span className="text-[11px] text-muted-foreground">· {distLabel}</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{legacy.createdAt}</p>
          </div>
          {urgent && mode === 'new' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-warning/15 text-warning px-2 py-0.5 rounded-full">
              <Zap size={10} fill="currentColor" /> Urgent
            </span>
          )}
          {mode === 'accepted' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              <Check size={11} /> Accepted
            </span>
          )}
          {mode === 'history' && (
            <StatusBadge type={isCompleted ? 'completed' : 'cancelled'} />
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-accent flex-shrink-0 flex items-center justify-center text-lg">
            🐾
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">
              {petName} · {careTypeLabels[legacy.careType]}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock size={11} /> {legacy.startAt}
            </p>
          </div>
          <span className="flex items-center gap-1 text-[13px] font-bold text-warning">
            <Star size={13} fill="currentColor" /> {legacy.creditsOffered}
          </span>
        </div>

        {legacy.notes && mode !== 'history' && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{legacy.notes}</p>
        )}

        {mode === 'new' && (
          <div className="flex gap-2">
            <button onClick={() => handleDecline(legacy)} className="btn-outline flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5">
              <X size={14} /> Decline
            </button>
            <button onClick={() => setActiveRequest(legacy)} className="btn-primary flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5">
              <Check size={14} /> Accept
            </button>
          </div>
        )}
        {mode === 'accepted' && (
          <div className="flex gap-2">
            <button onClick={() => navigate(`/messages?user=${raw.creator_id}`)} className="btn-outline flex-1 text-[13px] py-2.5 inline-flex items-center justify-center gap-1.5">
              <MessageCircle size={14} /> Message
            </button>
            <button onClick={() => setActiveRequest(legacy)} className="btn-primary flex-1 text-[13px] py-2.5">
              Open booking
            </button>
          </div>
        )}
        {mode === 'history' && (
          <div className="flex justify-end">
            <button onClick={() => setActiveRequest(legacy)} className="text-[13px] text-primary font-semibold">
              {isDeclined ? 'View details' : 'View summary'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-6 pb-3 safe-top">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground" aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-warning/15 text-warning px-2 py-0.5 rounded-full">
              <Zap size={10} fill="currentColor" /> {urgentCount} urgent
            </span>
          )}
        </div>
        <h1 className="heading-lg mb-1">Helper inbox</h1>
        <p className="text-[13px] text-muted-foreground mb-4">
          Real requests from owners nearby. Accept the ones you can take on.
        </p>
        <SegmentedControl options={tabOptions} value={tab} onChange={(v) => setTab(v as Tab)} />
      </div>

      {!myPostcode && (
        <div className="px-6 mt-2">
          <LocationPrompt inline />
        </div>
      )}

      <div className="px-6 mt-4 space-y-3">
        {tab === 'new' &&
          (loading ? (
            <p className="text-center text-[13px] text-muted-foreground py-8">Loading nearby requests…</p>
          ) : newRequests.length === 0 ? (
            <EmptyState
              emoji="📬"
              title="Inbox is clear"
              description="No new requests within 25 miles right now. We'll notify you as soon as one comes in."
              actionLabel="Browse all requests"
              onAction={() => navigate('/explore')}
            />
          ) : (
            newRequests.map((r) => renderRequestCard(r, 'new'))
          ))}

        {tab === 'accepted' &&
          (acceptedRequests.length === 0 ? (
            <EmptyState
              emoji="🤝"
              title="No active bookings"
              description="Accepted bookings live here so you can prep handover and message the owner."
            />
          ) : (
            acceptedRequests.map((r) => renderRequestCard(r, 'accepted'))
          ))}

        {tab === 'history' &&
          (historyRequests.length === 0 ? (
            <EmptyState
              emoji="📜"
              title="No history yet"
              description="Completed and declined requests will appear here for your records."
            />
          ) : (
            historyRequests.map((r) => renderRequestCard(r, 'history'))
          ))}
      </div>

      <BookingConfirmationSheet
        isOpen={!!activeRequest}
        onClose={() => setActiveRequest(null)}
        request={activeRequest}
      />
      <BottomNav />
    </div>
  );
};

export default Inbox;
