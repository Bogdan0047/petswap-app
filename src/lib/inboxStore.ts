import { useEffect, useState } from 'react';

/**
 * Lightweight client-side store for the helper inbox + bookings.
 * In the UI-first phase this is localStorage backed; the live backend
 * (care_requests + swaps tables already exist) can replace this layer
 * without changing the surface contract.
 */

export type InboxStatus = 'pending' | 'accepted' | 'declined';

export interface InboxState {
  /** request id -> status override */
  status: Record<string, InboxStatus>;
  /** swap-like booking records keyed by request id */
  bookings: Record<string, BookingRecord>;
}

export interface BookingRecord {
  requestId: string;
  helperId: string; // 'me' for current user as helper
  ownerId: string;
  petId: string;
  startAt: string;
  notes: string;
  /** Per-step handover checklist progress. */
  checklist: Record<string, boolean>;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  acceptedAt: string;
  completedAt?: string;
}

const KEY = 'petswap.inbox.v1';
const EVENT = 'petswap:inbox-changed';

const empty = (): InboxState => ({ status: {}, bookings: {} });

const read = (): InboxState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as InboxState;
    return {
      status: parsed.status ?? {},
      bookings: parsed.bookings ?? {},
    };
  } catch {
    return empty();
  }
};

const write = (next: InboxState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const acceptRequest = (params: {
  requestId: string;
  ownerId: string;
  petId: string;
  startAt: string;
  notes?: string;
}) => {
  const state = read();
  state.status[params.requestId] = 'accepted';
  state.bookings[params.requestId] = {
    requestId: params.requestId,
    helperId: 'me',
    ownerId: params.ownerId,
    petId: params.petId,
    startAt: params.startAt,
    notes: params.notes ?? '',
    checklist: {},
    status: 'scheduled',
    acceptedAt: new Date().toISOString(),
  };
  write(state);
};

export const declineRequest = (requestId: string) => {
  const state = read();
  state.status[requestId] = 'declined';
  delete state.bookings[requestId];
  write(state);
};

export const updateChecklist = (requestId: string, key: string, value: boolean) => {
  const state = read();
  const booking = state.bookings[requestId];
  if (!booking) return;
  booking.checklist = { ...booking.checklist, [key]: value };
  state.bookings[requestId] = booking;
  write(state);
};

export const markBookingCompleted = (requestId: string) => {
  const state = read();
  const booking = state.bookings[requestId];
  if (!booking) return;
  booking.status = 'completed';
  booking.completedAt = new Date().toISOString();
  state.bookings[requestId] = booking;
  write(state);
};

export const useInbox = (): InboxState => {
  const [state, setState] = useState<InboxState>(() => read());
  useEffect(() => {
    const refresh = () => setState(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return state;
};

/** Heuristic: a request is urgent if the start text contains "today"/"tonight" or "in N hour". */
export const isUrgent = (startAt: string, createdAt: string): boolean => {
  const lower = `${startAt} ${createdAt}`.toLowerCase();
  if (/today|tonight|this morning|this evening|asap/.test(lower)) return true;
  if (/in \d+\s?(hr|hour)/.test(lower)) return true;
  return false;
};
