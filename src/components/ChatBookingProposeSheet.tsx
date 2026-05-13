import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, Star, CalendarRange, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import TrustHeroPill from './TrustHeroPill';
import TrustBadge from './TrustBadge';
import { supabase } from '@/integrations/supabase/client';
import { useTrustProfile } from '@/hooks/useTrustProfile';
import { recordConversionEvent } from '@/lib/conversionEvents';
import { friendlyError } from '@/lib/friendlyError';

interface Pet {
  id: string;
  name: string;
  type: string;
}

interface OtherProfile {
  id: string;
  first_name: string | null;
  is_id_verified: boolean;
}

interface ChatBookingProposeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  myUserId: string;
}

type Preset = 'this_weekend' | 'next_weekend' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Returns the next Saturday 09:00 / Sunday 18:00 pair (or this weekend if still upcoming). */
const weekendRange = (offsetWeeks = 0) => {
  const now = new Date();
  // 6 = Saturday
  const day = now.getDay();
  const daysUntilSat = ((6 - day + 7) % 7) + offsetWeeks * 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + (daysUntilSat === 0 && day !== 6 ? 7 : daysUntilSat));
  sat.setHours(9, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(18, 0, 0, 0);
  return { start: sat, end: sun };
};

const defaultCustom = () => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  return { start, end };
};

const ChatBookingProposeSheet = ({ isOpen, onClose, conversationId, myUserId }: ChatBookingProposeSheetProps) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState<string>('');
  const [other, setOther] = useState<OtherProfile | null>(null);
  const [preset, setPreset] = useState<Preset>('this_weekend');
  const initialThis = useMemo(() => weekendRange(0), []);
  const [startAt, setStartAt] = useState(toLocalInput(initialThis.start));
  const [endAt, setEndAt] = useState(toLocalInput(initialThis.end));
  const [credits, setCredits] = useState('2');
  const [pickupNotes, setPickupNotes] = useState('');
  const [emergency, setEmergency] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: trust } = useTrustProfile(other?.id);

  // Load pets + other party
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const [petsRes, convRes] = await Promise.all([
        supabase
          .from('pets')
          .select('id, name, type')
          .eq('owner_id', myUserId)
          .order('created_at', { ascending: true }),
        supabase
          .from('conversations')
          .select('user_a, user_b')
          .eq('id', conversationId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const list = (petsRes.data as Pet[]) ?? [];
      setPets(list);
      if (list[0]) setPetId(list[0].id);

      const otherId =
        convRes.data?.user_a === myUserId ? convRes.data?.user_b : convRes.data?.user_a;
      if (otherId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, first_name, is_id_verified')
          .eq('id', otherId)
          .maybeSingle();
        if (!cancelled && prof) setOther(prof as OtherProfile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, myUserId, conversationId]);

  // Track sheet opened (one event per conversation, dedup'd)
  useEffect(() => {
    if (!isOpen) return;
    recordConversionEvent({
      userId: myUserId,
      eventType: 'booking_proposal_opened',
      sourceEventId: conversationId,
      conversationId,
    });
  }, [isOpen, myUserId, conversationId]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'this_weekend') {
      const r = weekendRange(0);
      setStartAt(toLocalInput(r.start));
      setEndAt(toLocalInput(r.end));
    } else if (p === 'next_weekend') {
      const r = weekendRange(1);
      setStartAt(toLocalInput(r.start));
      setEndAt(toLocalInput(r.end));
    } else {
      const r = defaultCustom();
      setStartAt(toLocalInput(r.start));
      setEndAt(toLocalInput(r.end));
    }
  };

  const handleSubmit = async () => {
    if (!petId) {
      toast.error('Choose which pet this booking is for.');
      return;
    }
    if (!agreed) {
      toast.error('Please confirm the safety agreement to continue.');
      return;
    }
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(start < end)) {
      toast.error('End time must be after the start time.');
      return;
    }
    const creditsInt = Math.max(0, Math.min(50, parseInt(credits, 10) || 0));

    setBusy(true);
    const notesCombined = [
      pickupNotes.trim(),
      emergency.trim() ? `Emergency contact: ${emergency.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 400) || null;

    const { error } = await supabase.rpc('propose_chat_booking', {
      _conversation_id: conversationId,
      _pet_id: petId,
      _start_at: start.toISOString(),
      _end_at: end.toISOString(),
      _credits_amount: creditsInt,
      _pickup_notes: notesCombined,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "booking"));
      return;
    }

    // Funnel: booking request sent
    recordConversionEvent({
      userId: myUserId,
      eventType: 'booking_request_sent',
      sourceEventId: `${conversationId}:${start.toISOString()}`,
      conversationId,
      metadata: { credits: creditsInt },
    });

    toast.success('Booking proposed');
    onClose();
  };

  const firstName = other?.first_name ?? 'them';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="lg">
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">Propose a booking</p>
        <h3 className="font-bold text-[17px]">Lock in your PetSwap dates</h3>
      </div>

      {/* Trust summary */}
      {other && (
        <div className="card-flat p-3 mb-3 bg-muted/40">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[14px]">{firstName}</p>
            {trust && <TrustHeroPill score={trust.score} tier={trust.tier} size="sm" />}
            {other.is_id_verified && <TrustBadge type="id_checked" />}
          </div>
          {trust && (
            <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5">
                <Star size={11} className="text-warning" fill="currentColor" />
                <span className="font-semibold text-foreground">{trust.average_rating.toFixed(1)}</span>
                <span className="ml-0.5">({trust.total_reviews})</span>
              </span>
              <span>· {trust.completed_swaps} swaps</span>
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground mt-2 leading-snug">
            <ShieldCheck size={11} className="inline mr-1 text-primary" />
            Keep communication inside PetSwap so we can support you if anything comes up.
          </p>
        </div>
      )}

      {pets.length === 0 ? (
        <div className="card-flat p-4 text-center">
          <p className="text-[13px] font-semibold mb-1">No pets on your profile</p>
          <p className="text-[12px] text-muted-foreground">
            Add a pet from your profile to propose a booking. The other person can also propose if they're the owner.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pet</label>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.type}
                </option>
              ))}
            </select>
          </div>

          {/* Smart date presets */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">When</label>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {([
                { id: 'this_weekend', label: 'This weekend', icon: Sparkles },
                { id: 'next_weekend', label: 'Next weekend', icon: CalendarRange },
                { id: 'custom', label: 'Choose dates', icon: CalendarRange },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={`px-2 py-2 rounded-md text-[12px] font-semibold inline-flex items-center justify-center gap-1 transition-colors ${
                    preset === id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground/80'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Drop-off</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => {
                  setStartAt(e.target.value);
                  setPreset('custom');
                }}
                className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pick-up</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => {
                  setEndAt(e.target.value);
                  setPreset('custom');
                }}
                className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Credits</label>
            <input
              type="number"
              min={0}
              max={50}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pickup / dropoff notes</label>
            <textarea
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
              placeholder="e.g. Lockbox by the door, code 4421"
              maxLength={300}
              rows={2}
              className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Emergency contact (optional)</label>
            <input
              type="text"
              value={emergency}
              onChange={(e) => setEmergency(e.target.value)}
              placeholder="Name + phone"
              maxLength={80}
              className="mt-1 w-full px-3 py-2.5 rounded-md bg-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Consent gate */}
          <label className="flex items-start gap-2 px-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-[12px] text-foreground/85 leading-snug">
              I agree to communicate clearly and care responsibly.
            </span>
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-outline flex-1 text-[14px] py-3">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy || !agreed}
              className="btn-primary flex-1 text-[14px] py-3 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Send booking request
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default ChatBookingProposeSheet;
