import { useMemo } from 'react';
import { MapPin, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react';
import BottomSheet from './BottomSheet';
import UserAvatar from './UserAvatar';
import { useNearbyHelpers, type NearbyHelper } from '@/hooks/useNearbyHelpers';
import { useBlockedIds } from '@/lib/blockStore';
import { trackEvent } from '@/lib/analyticsStore';
import { haptic } from '@/lib/haptic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  myUserId: string | null | undefined;
  myPostcode: string | null | undefined;
  myCoords?: { lat: number; lng: number } | null;
  /** Called when user taps "Send request" on a helper. */
  onSendRequest: (helperId: string) => void;
}

/**
 * Auto-suggest sheet shown right after location verify (and again on next
 * Home open). Surfaces the 3 closest, most-trusted helpers and offers a
 * one-tap "Send request" path into the QuickRequestSheet.
 */
const SuggestNeighboursSheet = ({ isOpen, onClose, myUserId, myPostcode, myCoords, onSendRequest }: Props) => {
  const blockedIds = useBlockedIds();
  const { helpers } = useNearbyHelpers({
    myPostcode,
    myCoords,
    myUserId,
    radius: 25,
    limit: 12,
    blockedIds,
  });

  const top3 = useMemo<NearbyHelper[]>(() => {
    // Closest + highest trust + most recently active.
    return [...helpers]
      .sort((a, b) => {
        const ad = a.distanceMiles ?? 999;
        const bd = b.distanceMiles ?? 999;
        if (ad !== bd) return ad - bd;
        if ((b.trust_score ?? 0) !== (a.trust_score ?? 0)) return (b.trust_score ?? 0) - (a.trust_score ?? 0);
        const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
        const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
        return bt - at;
      })
      .slice(0, 3);
  }, [helpers]);

  const headerCount = top3.length;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Ready to help</p>
            <h2 className="font-bold text-[18px] leading-tight">
              {headerCount > 0
                ? `${headerCount} ${headerCount === 1 ? 'person' : 'people'} near you ready to help`
                : 'No neighbours within range yet'}
            </h2>
          </div>
        </div>
        <p className="text-[12.5px] text-muted-foreground mt-1.5 ml-11">
          {headerCount > 0
            ? 'Send a quick hello — most replies arrive within a day.'
            : 'Try widening your radius from Explore.'}
        </p>

        {top3.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {top3.map((h) => {
              const name = (h.first_name || 'Member').trim() || 'Member';
              const dist =
                h.distanceMiles == null
                  ? h.area || 'Nearby'
                  : `${h.distanceMiles < 1 ? '<1' : Math.round(h.distanceMiles)} mi away`;
              const verifiedCount =
                (h.is_email_verified ? 1 : 0) + (h.is_location_verified ? 1 : 0) + (h.is_pet_owner_verified ? 1 : 0);
              return (
                <li
                  key={h.id}
                  className="card-elevated p-3.5 flex items-center gap-3"
                >
                  <UserAvatar name={name} src={h.avatar_url || undefined} size={48} rounded={14} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-[14.5px] truncate">{name}</p>
                      {verifiedCount >= 2 && <ShieldCheck size={13} className="text-success flex-shrink-0" />}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {dist}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      haptic('medium');
                      trackEvent('first_swap_suggest_send', h.id);
                      onSendRequest(h.id);
                    }}
                    className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[12.5px] font-semibold px-3.5 py-2 rounded-xl active:scale-[0.97] transition shadow-[0_3px_10px_-3px_hsl(var(--primary)/0.5)]"
                  >
                    Send request
                    <ChevronRight size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 card-flat p-5 text-center text-[13px] text-muted-foreground">
            We'll notify you the moment a verified neighbour joins your area.
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            trackEvent('first_swap_suggest_dismiss');
            onClose();
          }}
          className="mt-4 w-full text-[13px] font-semibold text-muted-foreground py-2.5 active:scale-[0.98] transition"
        >
          Maybe later
        </button>
      </div>
    </BottomSheet>
  );
};

export default SuggestNeighboursSheet;
