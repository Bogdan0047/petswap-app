import { useEffect, useState } from 'react';

/**
 * Boost store — owners can boost an urgent care request for 24h so it
 * surfaces above standard listings and triggers instant alerts to nearby
 * helpers. Boost is paid in credits (3) OR with a small one-tap payment
 * (mock — wired to a real provider later).
 *
 * Persisted client-side; each entry holds the request id and its expiry.
 */

export type BoostMethod = 'credits' | 'payment';

export interface BoostRecord {
  requestId: string;
  method: BoostMethod;
  /** ISO timestamp when the boost expires. */
  expiresAt: string;
  createdAt: string;
}

const KEY = 'petswap.boosts.v1';
const EVENT = 'petswap:boosts-changed';

/** Cost in credits to boost a request for 24h. */
export const BOOST_CREDITS_COST = 3;
/** Equivalent one-tap payment price in GBP. */
export const BOOST_PAYMENT_PRICE = '£1.99';
/** Boost duration in hours. */
export const BOOST_DURATION_HOURS = 24;

const read = (): Record<string, BoostRecord> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const write = (next: Record<string, BoostRecord>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

const isActive = (record: BoostRecord): boolean =>
  Date.parse(record.expiresAt) > Date.now();

/** Returns true if the request currently has an active boost. */
export const isBoosted = (requestId: string): boolean => {
  const record = read()[requestId];
  return !!record && isActive(record);
};

export const getBoostExpiry = (requestId: string): string | null => {
  const record = read()[requestId];
  if (!record || !isActive(record)) return null;
  return record.expiresAt;
};

export const boostRequest = (requestId: string, method: BoostMethod): BoostRecord => {
  const now = Date.now();
  const record: BoostRecord = {
    requestId,
    method,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + BOOST_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
  };
  const all = read();
  all[requestId] = record;
  write(all);
  return record;
};

/** Returns the active boost set as a reactive hook for UI. */
export const useActiveBoosts = (): Record<string, BoostRecord> => {
  const [boosts, setBoosts] = useState<Record<string, BoostRecord>>(() => {
    const all = read();
    const filtered: Record<string, BoostRecord> = {};
    Object.values(all).forEach(b => {
      if (isActive(b)) filtered[b.requestId] = b;
    });
    return filtered;
  });

  useEffect(() => {
    const refresh = () => {
      const all = read();
      const filtered: Record<string, BoostRecord> = {};
      Object.values(all).forEach(b => {
        if (isActive(b)) filtered[b.requestId] = b;
      });
      setBoosts(filtered);
    };
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    // Re-check expiry every minute so the badge auto-disappears.
    const tick = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(tick);
    };
  }, []);

  return boosts;
};

/** Format remaining boost time as a friendly "Xh Ym left" string. */
export const formatBoostRemaining = (expiresAt: string): string => {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};
