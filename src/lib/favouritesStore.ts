import { useEffect, useState, useCallback } from 'react';

const KEY = 'petswap.favouriteHelpers.v1';
const EVENT = 'petswap:favourites-changed';

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
};

export const getFavouriteIds = (): string[] => read();

export const isFavourite = (userId: string): boolean => read().includes(userId);

export const toggleFavourite = (userId: string): boolean => {
  const ids = read();
  const exists = ids.includes(userId);
  const next = exists ? ids.filter(i => i !== userId) : [...ids, userId];
  write(next);
  return !exists;
};

export const removeFavourite = (userId: string) => {
  write(read().filter(i => i !== userId));
};

/** Reactive hook returning the current set of favourite helper IDs. */
export const useFavouriteIds = (): string[] => {
  const [ids, setIds] = useState<string[]>(() => read());
  useEffect(() => {
    const refresh = () => setIds(read());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return ids;
};

/** Convenience hook for a single user — returns [isFav, toggle]. */
export const useFavourite = (userId: string): [boolean, () => boolean] => {
  const ids = useFavouriteIds();
  const toggle = useCallback(() => toggleFavourite(userId), [userId]);
  return [ids.includes(userId), toggle];
};
