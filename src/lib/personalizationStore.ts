import { useEffect, useState } from 'react';
import { useInbox } from './inboxStore';

/**
 * Personalization store: derives the user's "lean" — owner / helper / mixed —
 * from observed historical behaviour so the home feed can reorder rails.
 *
 * Signals tracked client-side (localStorage): how many times the user has
 * opened the QuickRequestSheet (owner intent) vs. accepted a request as a
 * helper (helper intent). Combined with persisted booking history from the
 * inbox store, this produces a stable, fast, no-backend lean classifier.
 */

export type Lean = 'owner' | 'helper' | 'mixed' | 'new';

interface Counters {
  /** Times user has opened the request sheet to ask for help. */
  ownerIntent: number;
  /** Explicit helper-side actions (open inbox, view requests feed, etc.). */
  helperIntent: number;
  /** First-touch timestamp so we can show "new" until enough signal exists. */
  firstSeenAt: number;
}

const KEY = 'petswap.personalization.v1';
const EVENT = 'petswap:personalization-changed';

const empty = (): Counters => ({
  ownerIntent: 0,
  helperIntent: 0,
  firstSeenAt: Date.now(),
});

const read = (): Counters => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seed = empty();
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Counters;
    return {
      ownerIntent: Number.isFinite(parsed.ownerIntent) ? parsed.ownerIntent : 0,
      helperIntent: Number.isFinite(parsed.helperIntent) ? parsed.helperIntent : 0,
      firstSeenAt: Number.isFinite(parsed.firstSeenAt) ? parsed.firstSeenAt : Date.now(),
    };
  } catch {
    return empty();
  }
};

const write = (next: Counters) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const trackOwnerIntent = () => {
  const c = read();
  c.ownerIntent += 1;
  write(c);
};

export const trackHelperIntent = () => {
  const c = read();
  c.helperIntent += 1;
  write(c);
};

/**
 * Derive lean from counters + inbox bookings.
 * - Need at least 3 total signals before we commit to a lean.
 * - 70%+ in one direction wins; otherwise mixed.
 */
export const deriveLean = (
  counters: Counters,
  helperBookings: number,
): Lean => {
  const owner = counters.ownerIntent;
  const helper = counters.helperIntent + helperBookings * 2; // bookings weigh more
  const total = owner + helper;
  if (total < 3) return 'new';
  const ownerPct = owner / total;
  if (ownerPct >= 0.7) return 'owner';
  if (ownerPct <= 0.3) return 'helper';
  return 'mixed';
};

/** Reactive hook returning the current lean and raw counters. */
export const usePersonalization = () => {
  const [counters, setCounters] = useState<Counters>(() => read());
  const inbox = useInbox();
  useEffect(() => {
    const refresh = () => setCounters(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const helperBookings = Object.values(inbox.bookings).filter(b => b.helperId === 'me').length;
  return {
    counters,
    helperBookings,
    lean: deriveLean(counters, helperBookings),
  };
};

export const leanLabel = (lean: Lean): string => {
  switch (lean) {
    case 'owner':
      return 'Pet owner';
    case 'helper':
      return 'Helper';
    case 'mixed':
      return 'Owner & helper';
    case 'new':
      return 'New member';
  }
};
