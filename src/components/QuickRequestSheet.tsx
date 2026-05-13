import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Star,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Check,
  Repeat,
  CalendarDays,
  Loader2,
  Clock,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import TrustScore from './TrustScore';
import {
  mockPets,
  mockUsers,
  currentUser,
  careTypeLabels,
  careTypeCredits,
  type CareRequest,
  type User,
} from '@/data/mockData';
import { getPetPhoto, getUserAvatar } from '@/assets/images';
import { nextDays } from '@/lib/availability';
import { isWithinRadius } from '@/lib/distance';
import { rankByFreshness, matchesSegment, isOnlineNow } from '@/lib/freshness';
import { computeTrust } from '@/lib/trust';
import { useBlockedIds } from '@/lib/blockStore';
import { trackOwnerIntent } from '@/lib/personalizationStore';
import { trackEvent } from '@/lib/analyticsStore';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';

interface QuickRequestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, that helper is pre-selected and matches step is skipped. */
  prefillHelperId?: string;
  /** Optional pre-selected pet (e.g. "Book again" flow). */
  prefillPetId?: string;
}

type Step = 'pet' | 'when' | 'notes' | 'matches' | 'done';
const STEPS: Step[] = ['pet', 'when', 'notes', 'matches', 'done'];

type DatePreset = 'today' | 'weekend' | 'specific' | 'weekly';

const careTypes: CareRequest['careType'][] = [
  'walk_checkin',
  'feeding_visit',
  'day_care',
  'evening_care',
  'overnight',
  'weekend_help',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Weekday = (typeof WEEKDAYS)[number];

interface SavedDraft {
  petId: string | null;
  careType: CareRequest['careType'];
  notes: string;
  datePreset?: DatePreset;
  selectedDates?: string[];
  recurringDays?: Weekday[];
  /** Last time the user touched the draft. Used for "Continue draft?" copy. */
  updatedAt?: number;
}

interface LastPostedRequest {
  id: string;
  petId: string | null;
  careType: CareRequest['careType'];
  notes: string;
  datePreset: DatePreset;
  selectedDates: string[];
  recurringDays: Weekday[];
  postedAt: number;
}

const DRAFT_KEY = 'petswap.lastRequest.v1';
const POSTED_KEY = 'petswap.lastPostedRequest.v1';
/** A draft older than this is treated as stale and ignored on open. */
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const loadDraft = (): SavedDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > DRAFT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (d: SavedDraft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, updatedAt: Date.now() }));
  } catch {
    /* noop */
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
};

const loadLastPosted = (): LastPostedRequest | null => {
  try {
    const raw = localStorage.getItem(POSTED_KEY);
    return raw ? (JSON.parse(raw) as LastPostedRequest) : null;
  } catch {
    return null;
  }
};

const saveLastPosted = (r: LastPostedRequest) => {
  try {
    localStorage.setItem(POSTED_KEY, JSON.stringify(r));
  } catch {
    /* noop */
  }
};

/** Validation schema applied right before submit. Limits keep things sane and prevent abuse. */
const requestSchema = z.object({
  petId: z.string({ required_error: 'Pick a pet' }).min(1, 'Pick a pet'),
  careType: z.enum([
    'walk_checkin',
    'feeding_visit',
    'day_care',
    'evening_care',
    'overnight',
    'weekend_help',
  ]),
  datePreset: z.enum(['today', 'weekend', 'specific', 'weekly']),
  selectedDates: z.array(z.string()).default([]),
  recurringDays: z.array(z.string()).default([]),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
    .default(''),
}).superRefine((val, ctx) => {
  if (val.datePreset === 'weekly' && val.recurringDays.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pick at least one weekday',
      path: ['recurringDays'],
    });
  }
  if (val.datePreset !== 'weekly' && val.selectedDates.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Pick at least one date',
      path: ['selectedDates'],
    });
  }
});

type ValidationErrors = Partial<Record<'petId' | 'selectedDates' | 'recurringDays' | 'notes', string>>;

const todayIso = () => new Date().toISOString().slice(0, 10);
const weekendIsos = (): string[] => {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const wd = d.getDay(); // 0 Sun, 6 Sat
    if (wd === 0 || wd === 6) out.push(d.toISOString().slice(0, 10));
    if (out.length >= 2) break;
  }
  return out;
};

const QuickRequestSheet = ({
  isOpen,
  onClose,
  prefillHelperId,
  prefillPetId,
}: QuickRequestSheetProps) => {
  const myPets = useMemo(
    () => mockPets.filter(p => p.ownerId === '1' || p.ownerId === 'me'),
    [],
  );
  const blockedIds = useBlockedIds();

  const targetedHelper: User | undefined = useMemo(
    () => (prefillHelperId ? mockUsers.find(u => u.id === prefillHelperId) : undefined),
    [prefillHelperId],
  );

  const [step, setStep] = useState<Step>('pet');
  const [petId, setPetId] = useState<string | null>(null);
  const [careType, setCareType] = useState<CareRequest['careType']>('walk_checkin');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [recurringDays, setRecurringDays] = useState<Set<Weekday>>(new Set());
  const [notes, setNotes] = useState('');
  const [autofilled, setAutofilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [editingPosted, setEditingPosted] = useState(false);
  /** Hard guard against double-submit triggered by double-tap or rapid clicks. */
  const submitLockRef = useRef(false);
  const submitStartedAtRef = useRef(0);
  const draftSaveTimerRef = useRef<number | null>(null);
  const initialisedRef = useRef(false);
  const days = useMemo(() => nextDays(14), []);

  const targetedTrust = useMemo(
    () => (targetedHelper ? computeTrust(targetedHelper) : null),
    [targetedHelper],
  );

  /** Smart restore from local draft + targeted helper / pet on open. */
  useEffect(() => {
    if (!isOpen) {
      initialisedRef.current = false;
      return;
    }
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    trackOwnerIntent();
    trackEvent('request_opened');
    const draft = loadDraft();

    if (prefillPetId && myPets.some(p => p.id === prefillPetId)) {
      setPetId(prefillPetId);
    } else if (draft?.petId && myPets.some(p => p.id === draft.petId)) {
      setPetId(draft.petId);
      setAutofilled(true);
    }
    if (draft?.careType) setCareType(draft.careType);
    if (draft?.notes) {
      setNotes(draft.notes);
    } else {
      // Friendly low-friction default for first-time / new users — they
      // can still edit it before sending. Keeps the "tap to send" feel.
      setNotes("Hi! I'd love to swap pet care 😊");
    }
    if (draft?.datePreset) setDatePreset(draft.datePreset);
    if (draft?.selectedDates?.length) {
      setSelectedDates(new Set(draft.selectedDates));
    }
    if (draft?.recurringDays?.length) {
      setRecurringDays(new Set(draft.recurringDays));
    }
  }, [isOpen, myPets, prefillPetId]);

  /** Default date preset when entering "when" step (only if nothing restored). */
  useEffect(() => {
    if (!isOpen) return;
    if (selectedDates.size === 0 && datePreset !== 'weekly') {
      setSelectedDates(new Set([todayIso()]));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Live autosave — debounced 400ms. Skips when nothing meaningful is filled. */
  useEffect(() => {
    if (!isOpen) return;
    if (!petId && !notes && selectedDates.size === 0 && recurringDays.size === 0) return;
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(() => {
      saveDraft({
        petId,
        careType,
        notes,
        datePreset,
        selectedDates: [...selectedDates],
        recurringDays: [...recurringDays],
      });
    }, 400);
    return () => {
      if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    };
  }, [isOpen, petId, careType, notes, datePreset, selectedDates, recurringDays]);

  /** Clear field-level error as soon as the user fixes the input. */
  useEffect(() => {
    if (errors.petId && petId) setErrors(e => ({ ...e, petId: undefined }));
  }, [petId, errors.petId]);
  useEffect(() => {
    if (errors.selectedDates && selectedDates.size > 0)
      setErrors(e => ({ ...e, selectedDates: undefined }));
  }, [selectedDates, errors.selectedDates]);
  useEffect(() => {
    if (errors.recurringDays && recurringDays.size > 0)
      setErrors(e => ({ ...e, recurringDays: undefined }));
  }, [recurringDays, errors.recurringDays]);
  useEffect(() => {
    if (errors.notes && notes.length <= 500) setErrors(e => ({ ...e, notes: undefined }));
  }, [notes, errors.notes]);

  const reset = () => {
    setStep('pet');
    setPetId(null);
    setSelectedDates(new Set());
    setRecurringDays(new Set());
    setNotes('');
    setCareType('walk_checkin');
    setDatePreset('today');
    setAutofilled(false);
    setSubmitting(false);
    setErrors({});
    setEditingPosted(false);
    submitLockRef.current = false;
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'today') {
      setSelectedDates(new Set([todayIso()]));
      setRecurringDays(new Set());
    } else if (preset === 'weekend') {
      setSelectedDates(new Set(weekendIsos()));
      setRecurringDays(new Set());
    } else if (preset === 'specific') {
      // keep current selection if any, else clear
      if (selectedDates.size === 0) setSelectedDates(new Set([todayIso()]));
      setRecurringDays(new Set());
    } else if (preset === 'weekly') {
      setSelectedDates(new Set());
    }
  };

  const toggleDate = (iso: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const toggleRecurring = (d: Weekday) => {
    setRecurringDays(prev => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const dateSummary = useMemo(() => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === 'weekend') return 'This weekend';
    if (datePreset === 'weekly') {
      if (recurringDays.size === 0) return 'Pick weekdays';
      const ordered = WEEKDAYS.filter(d => recurringDays.has(d));
      return `Every ${ordered.join(', ')}`;
    }
    if (selectedDates.size === 0) return 'Pick dates';
    if (selectedDates.size === 1) {
      const iso = [...selectedDates][0];
      const day = days.find(d => d.iso === iso);
      return day ? `${day.weekday} ${day.date.getDate()}` : '1 day';
    }
    return `${selectedDates.size} days`;
  }, [datePreset, selectedDates, recurringDays, days]);

  const dateValid =
    datePreset === 'weekly' ? recurringDays.size > 0 : selectedDates.size > 0;

  /** Trusted matches preview — ranked nearby helpers fitting the slot. */
  const matches = useMemo(() => {
    if (!petId || !dateValid) return [];
    if (targetedHelper) return [targetedHelper];
    // Use first selected date or today to derive segment
    const firstIso =
      datePreset === 'weekly' ? todayIso() : ([...selectedDates][0] ?? todayIso());
    const date = new Date(firstIso);
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const isWeekend =
      datePreset === 'weekend' || weekday === 'Sat' || weekday === 'Sun';
    const segment = isWeekend ? 'weekend' : 'next_week';
    const candidates = mockUsers.filter(
      u =>
        u.id !== '1' &&
        u.id !== 'me' &&
        u.role !== 'owner' &&
        !blockedIds.includes(u.id) &&
        isWithinRadius(currentUser.postcode, u.postcode, 25) &&
        matchesSegment(u, segment),
    );
    return rankByFreshness(candidates).slice(0, 3);
  }, [petId, dateValid, datePreset, selectedDates, blockedIds, targetedHelper]);

  /** Validate the entire form. Surfaces errors and routes back to the broken step. */
  const validate = useCallback((): boolean => {
    const result = requestSchema.safeParse({
      petId,
      careType,
      datePreset,
      selectedDates: [...selectedDates],
      recurringDays: [...recurringDays],
      notes,
    });
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ValidationErrors | undefined;
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    haptic('medium');
    // Route back to the first broken step so the field is visible.
    if (next.petId) setStep('pet');
    else if (next.selectedDates || next.recurringDays) setStep('when');
    else if (next.notes) setStep('notes');
    return false;
  }, [petId, careType, datePreset, selectedDates, recurringDays, notes]);

  const submit = () => {
    if (submitLockRef.current || submitting) return;
    if (!validate()) return;
    submitLockRef.current = true;
    submitStartedAtRef.current = Date.now();
    setSubmitting(true);
    haptic('light');

    const isTargeted = !!targetedHelper;
    const finish = () => {
      const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      saveLastPosted({
        id: requestId,
        petId,
        careType,
        notes,
        datePreset,
        selectedDates: [...selectedDates],
        recurringDays: [...recurringDays],
        postedAt: Date.now(),
      });
      clearDraft();
      trackEvent('request_sent', targetedHelper?.id);
      // First-swap activation: mark that this user has sent a request so
      // banners/nudges retire and the activation loop can advance.
      try {
        localStorage.setItem('petswap.firstSwap.requestSent.v1', '1');
        window.dispatchEvent(new CustomEvent('petswap:firstswap-changed'));
      } catch { /* ignore */ }
      haptic('success');
      toast.success(
        isTargeted
          ? `Request sent to ${targetedHelper?.firstName} 🎉`
          : 'Request sent to trusted helpers nearby 🎉',
        {
          description: isTargeted
            ? "Nice! Most users reply within 1 day."
            : matches.length > 0
              ? `Nice! ${matches.length} match${matches.length === 1 ? '' : 'es'} notified — most reply within a day.`
              : "Nice! Most users reply within 1 day.",
          duration: 5000,
        },
      );
      setStep('done');
      setSubmitting(false);
      // Release the lock after the success screen has had a beat to render.
      window.setTimeout(() => {
        submitLockRef.current = false;
      }, 400);
    };

    // Enforce a 220ms minimum so the spinner registers without feeling slow.
    // 90% of users will perceive this as instant, but it prevents the
    // jarring "did anything happen?" flash.
    const elapsed = Date.now() - submitStartedAtRef.current;
    const minDelay = 220;
    if (elapsed >= minDelay) finish();
    else window.setTimeout(finish, minDelay - elapsed);
  };

  /** Reopen the last posted request as an editable draft (rare but expected). */
  const editLastPosted = () => {
    const last = loadLastPosted();
    if (!last) return;
    setEditingPosted(true);
    setStep('pet');
    setPetId(last.petId);
    setCareType(last.careType);
    setNotes(last.notes);
    setDatePreset(last.datePreset);
    setSelectedDates(new Set(last.selectedDates));
    setRecurringDays(new Set(last.recurringDays));
    setErrors({});
    haptic('light');
  };

  const stepIndex = STEPS.indexOf(step);
  // Targeted helper flow has 3 visible steps (pet → when → notes → done) — skip matches
  const totalProgressSteps = targetedHelper ? 3 : 4;
  const visibleStepIndex = (() => {
    if (step === 'pet') return 0;
    if (step === 'when') return 1;
    if (step === 'notes') return 2;
    if (step === 'matches') return 3;
    return totalProgressSteps;
  })();
  const credits = careTypeCredits[careType];

  const goBack = () => {
    if (step === 'when') setStep('pet');
    else if (step === 'notes') setStep('when');
    else if (step === 'matches') setStep('notes');
  };

  const continueFromNotes = () => {
    if (targetedHelper) submit();
    else setStep('matches');
  };

  const selectedPet = myPets.find(p => p.id === petId);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} size="lg">
      {/* Progress bar + step header */}
      <div className="flex items-center gap-3 mb-5">
        {step !== 'pet' && step !== 'done' && (
          <button onClick={goBack} className="p-1 -ml-1" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1 flex items-center gap-1.5">
          {Array.from({ length: totalProgressSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                i <= visibleStepIndex && step !== 'done' ? 'bg-primary' : 'bg-muted',
                i === visibleStepIndex &&
                  step !== 'done' &&
                  'shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]',
              )}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold tabular-nums">
          {Math.min(visibleStepIndex + 1, totalProgressSteps)} / {totalProgressSteps}
        </span>
      </div>

      {/* Targeted helper banner — premium card with trust + availability */}
      {targetedHelper && targetedTrust && step !== 'done' && (
        <div className="mb-4 -mt-1 p-3 rounded-lg bg-gradient-to-br from-primary/8 to-primary/[0.03] border border-primary/15 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-md overflow-hidden bg-accent flex-shrink-0">
              {getUserAvatar(targetedHelper.id) ? (
                <img
                  src={getUserAvatar(targetedHelper.id)}
                  alt={targetedHelper.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">
                  {targetedHelper.avatarEmoji}
                </div>
              )}
              {isOnlineNow(targetedHelper) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold truncate">
                  Asking {targetedHelper.firstName} directly
                </p>
                {targetedHelper.isIdVerified && (
                  <ShieldCheck size={12} className="text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Clock size={10} /> {targetedHelper.lastActive} · {targetedHelper.distance}
              </p>
            </div>
            <TrustScore
              score={targetedTrust.score}
              tier={targetedTrust.tier}
              variant="pill"
              size="sm"
              showLabel={false}
            />
          </div>
          {targetedHelper.availability.daysAvailable.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10.5px] text-muted-foreground font-medium">Free:</span>
              {targetedHelper.availability.daysAvailable.slice(0, 5).map(d => (
                <span
                  key={d}
                  className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restore-from-draft chip */}
      {autofilled && step === 'pet' && !targetedHelper && !editingPosted && (
        <button
          onClick={() => {
            clearDraft();
            reset();
          }}
          className="mb-4 -mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full transition-all active:scale-[0.97]"
        >
          <Zap size={11} fill="currentColor" /> Draft restored · start fresh
        </button>
      )}
      {editingPosted && step !== 'done' && (
        <div className="mb-4 -mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-warning/10 text-warning px-2.5 py-1 rounded-full">
          <Pencil size={11} /> Editing your last request
        </div>
      )}

      {step === 'pet' && (
        <div className="animate-fade-in">
          <h3 className="font-bold text-[18px] mb-1">Which pet needs care?</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Pick the pet and the kind of help you need.
          </p>

          <div className="space-y-2 mb-5">
            {myPets.length === 0 && (
              <div className="card-flat p-4 text-center text-[13px] text-muted-foreground">
                Add a pet to your profile first.
              </div>
            )}
            {myPets.map(p => {
              const img = getPetPhoto(p.id);
              const active = petId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPetId(p.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-fast active:scale-[0.99]',
                    active ? 'border-primary bg-primary/5' : 'border-border-light bg-surface',
                  )}
                >
                  <div className="w-11 h-11 rounded-md overflow-hidden bg-accent flex-shrink-0">
                    {img ? (
                      <img src={img} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        {p.avatarEmoji}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[14px]">{p.name}</p>
                    <p className="text-[12px] text-muted-foreground">{p.breed}</p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      active ? 'border-primary bg-primary' : 'border-border',
                    )}
                  >
                    {active && <Check size={12} className="text-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.petId && (
            <p className="text-[12px] text-destructive flex items-center gap-1.5 mb-3 -mt-3" role="alert">
              <AlertCircle size={12} /> {errors.petId}
            </p>
          )}

          <p className="text-[12px] font-semibold text-muted-foreground mb-2">Type of care</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {careTypes.map(t => {
              const active = careType === t;
              return (
                <button
                  key={t}
                  onClick={() => setCareType(t)}
                  className={cn(
                    'p-3 rounded-md text-left transition-all duration-fast active:scale-[0.97]',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80',
                  )}
                >
                  <p className="text-[13px] font-semibold">{careTypeLabels[t]}</p>
                  <p
                    className={cn(
                      'text-[11px] mt-0.5 flex items-center gap-1',
                      active ? 'opacity-90' : 'text-muted-foreground',
                    )}
                  >
                    <Star size={10} fill="currentColor" /> {careTypeCredits[t]} cr
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep('when')}
            disabled={!petId}
            className={cn(
              'btn-primary w-full text-[15px]',
              !petId && 'opacity-50 cursor-not-allowed',
            )}
          >
            Continue <ChevronRight size={16} className="inline -mr-1" />
          </button>
        </div>
      )}

      {step === 'when' && (
        <div className="animate-fade-in">
          <h3 className="font-bold text-[18px] mb-1">When do you need help?</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Pick a quick option or set specific dates.
          </p>

          {/* Preset segmented control */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted rounded-lg mb-4">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'weekend', label: 'Weekend' },
                { id: 'specific', label: 'Dates' },
                { id: 'weekly', label: 'Weekly' },
              ] as { id: DatePreset; label: string }[]
            ).map(p => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={cn(
                    'rounded-md py-2 text-[12px] font-semibold transition-all duration-fast active:scale-[0.96]',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Today / Weekend recap */}
          {(datePreset === 'today' || datePreset === 'weekend') && (
            <div className="card-flat p-4 mb-4 flex items-center gap-3">
              <CalendarDays size={18} className="text-primary" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold">{dateSummary}</p>
                <p className="text-[11px] text-muted-foreground">
                  {datePreset === 'today'
                    ? 'Helpers active right now will be notified first.'
                    : 'Both Saturday and Sunday selected.'}
                </p>
              </div>
            </div>
          )}

          {/* Specific date multi-select */}
          {datePreset === 'specific' && (
            <div className="grid grid-cols-5 gap-2 mb-4">
              {days.map(d => {
                const active = selectedDates.has(d.iso);
                return (
                  <button
                    key={d.iso}
                    onClick={() => toggleDate(d.iso)}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-md py-2.5 transition-all duration-fast active:scale-[0.95]',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground/80',
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase opacity-80">
                      {d.weekday}
                    </span>
                    <span className="text-[14px] font-bold">{d.date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Weekly recurring weekday picker */}
          {datePreset === 'weekly' && (
            <div className="mb-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={14} className="text-primary" />
                <p className="text-[12px] font-semibold">Repeat every week on</p>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map(d => {
                  const active = recurringDays.has(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleRecurring(d)}
                      className={cn(
                        'rounded-md py-2.5 text-[11px] font-bold transition-all duration-fast active:scale-[0.95]',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-foreground/70',
                      )}
                    >
                      {d.charAt(0)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {recurringDays.size === 0
                  ? 'Pick at least one weekday.'
                  : `Helpers free on ${dateSummary.replace('Every ', '')} will see this first.`}
              </p>
            </div>
          )}

          {(errors.selectedDates || errors.recurringDays) && (
            <p className="text-[12px] text-destructive flex items-center gap-1.5 mb-3 -mt-1" role="alert">
              <AlertCircle size={12} /> {errors.selectedDates || errors.recurringDays}
            </p>
          )}

          <button
            onClick={() => setStep('notes')}
            disabled={!dateValid}
            className={cn(
              'btn-primary w-full text-[15px]',
              !dateValid && 'opacity-50 cursor-not-allowed',
            )}
          >
            Continue <ChevronRight size={16} className="inline -mr-1" />
          </button>
        </div>
      )}

      {step === 'notes' && (
        <div className="animate-fade-in">
          <h3 className="font-bold text-[18px] mb-1">Anything helpers should know?</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Optional. Mention temperament, feeding times, or special needs.
          </p>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value.slice(0, 500))}
            placeholder="e.g. Charlie is friendly but pulls on the lead."
            rows={4}
            maxLength={500}
            aria-invalid={!!errors.notes}
            className={cn(
              'w-full p-3 rounded-md border bg-surface text-[14px] resize-none focus:outline-none mb-1.5 transition-colors',
              errors.notes
                ? 'border-destructive focus:border-destructive'
                : 'border-border focus:border-primary',
            )}
          />
          <div className="flex items-center justify-between mb-3 min-h-[16px]">
            {errors.notes ? (
              <p className="text-[12px] text-destructive flex items-center gap-1.5" role="alert">
                <AlertCircle size={12} /> {errors.notes}
              </p>
            ) : (
              <span />
            )}
            <span
              className={cn(
                'text-[11px] tabular-nums',
                notes.length > 480 ? 'text-warning font-semibold' : 'text-muted-foreground',
              )}
            >
              {notes.length}/500
            </span>
          </div>
          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {['Friendly with strangers', 'Needs medication', 'Walks on lead', 'Indoor only'].map(s => (
              <button
                key={s}
                onClick={() =>
                  setNotes(prev => (prev ? `${prev}${prev.endsWith('.') ? ' ' : '. '}${s}` : s))
                }
                className="text-[11px] font-semibold bg-muted text-foreground/70 px-2.5 py-1 rounded-full transition-all active:scale-[0.96] hover:bg-muted/80"
              >
                + {s}
              </button>
            ))}
          </div>

          <div className="card-flat p-4 mb-5 flex items-center gap-3 bg-primary/5">
            <Star size={18} className="text-warning" fill="currentColor" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold">
                {credits} credit{credits === 1 ? '' : 's'} · {dateSummary}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Standard rate for this care type.
              </p>
            </div>
          </div>

          <button
            onClick={continueFromNotes}
            disabled={submitting}
            className={cn('btn-primary w-full text-[15px] inline-flex items-center justify-center gap-1.5', submitting && 'opacity-70 cursor-wait')}
          >
            {submitting && targetedHelper ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                {targetedHelper ? `Send to ${targetedHelper.firstName}` : 'See trusted matches'}
                <ChevronRight size={16} className="-mr-1" />
              </>
            )}
          </button>
        </div>
      )}

      {step === 'matches' && (
        <div className="animate-fade-in">
          <h3 className="font-bold text-[18px] mb-1">Best trusted matches</h3>
          <p className="text-[13px] text-muted-foreground mb-4">
            Ranked by trust, recency and reliability. They'll be notified first.
          </p>

          {/* Recap card */}
          <div className="card-flat p-3 mb-4 flex items-center gap-3">
            {selectedPet && (
              <div className="w-9 h-9 rounded-md overflow-hidden bg-accent flex-shrink-0">
                {getPetPhoto(selectedPet.id) ? (
                  <img
                    src={getPetPhoto(selectedPet.id)}
                    alt={selectedPet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {selectedPet.avatarEmoji}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">
                {selectedPet?.name} · {careTypeLabels[careType]}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {dateSummary} · {credits} credit{credits === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="card-flat p-5 text-center mb-5">
              <Sparkles size={22} className="text-primary mx-auto mb-2" />
              <p className="font-semibold text-[14px]">No instant matches</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                We'll still post your request — helpers will see it as soon as they're online.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {matches.map(u => {
                const avatar = getUserAvatar(u.id);
                const t = computeTrust(u);
                return (
                  <div
                    key={u.id}
                    className="card-flat p-3 flex items-center gap-3 animate-fade-in"
                  >
                    <div className="w-11 h-11 rounded-md bg-accent overflow-hidden flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={u.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          {u.avatarEmoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[14px] truncate">{u.firstName}</p>
                        {u.isIdVerified && (
                          <ShieldCheck size={12} className="text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {u.distance} · {u.responseRate}% reply
                      </p>
                    </div>
                    <TrustScore
                      score={t.score}
                      tier={t.tier}
                      variant="pill"
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className={cn('btn-primary w-full text-[15px] inline-flex items-center justify-center gap-1.5', submitting && 'opacity-70 cursor-wait')}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send request to{' '}
                {matches.length > 0
                  ? `${matches.length} helper${matches.length === 1 ? '' : 's'}`
                  : 'nearby helpers'}
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Posted in under 20 seconds · cancel anytime
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center pt-8 pb-2 animate-scale-in">
          {/* Drawn check — soft pulse halo + crisp tick */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping" />
            <div className="absolute inset-1 rounded-full bg-primary/10" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg animate-tick-pop">
              <svg width="36" height="36" viewBox="0 0 24 24" className="text-primary-foreground">
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: 'ring-draw 420ms cubic-bezier(0.16, 1, 0.3, 1) 120ms forwards',
                  }}
                />
              </svg>
            </div>
          </div>
          <p className="font-bold text-[18px]">Request sent</p>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[260px] mx-auto">
            {targetedHelper
              ? `${targetedHelper.firstName} just got a notification. You'll hear back fast.`
              : matches.length > 0
                ? `${matches.length} trusted helper${matches.length === 1 ? '' : 's'} notified instantly.`
                : 'Trusted helpers nearby will see it now.'}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Sparkles size={11} fill="currentColor" /> Sent in under 20 seconds
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={editLastPosted}
              className="btn-outline w-full text-[14px] inline-flex items-center justify-center gap-1.5"
            >
              <Pencil size={14} /> Edit request
            </button>
            <button onClick={handleClose} className="btn-primary w-full text-[15px]">
              Done
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default QuickRequestSheet;
