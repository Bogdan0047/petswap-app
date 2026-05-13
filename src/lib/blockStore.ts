// Lightweight client-side block list. Used to immediately hide blocked users
// from search/match/chat lists. The backend `blocks` table + RPCs remain the
// source of truth once auth is wired in.

import { useEffect, useState } from 'react';

const KEY = 'petswap.blocks.v1';

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent('petswap:blocks-changed'));
};

export const blockStore = {
  list: read,
  isBlocked: (id: string) => read().includes(id),
  block: (id: string) => write([...read(), id]),
  unblock: (id: string) => write(read().filter((x) => x !== id)),
};

export const useBlockedIds = () => {
  const [ids, setIds] = useState<string[]>(() => read());
  useEffect(() => {
    const handler = () => setIds(read());
    window.addEventListener('petswap:blocks-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('petswap:blocks-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return ids;
};
