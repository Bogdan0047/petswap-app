import { useCallback, useEffect, useState } from 'react';
import { useMyProfile } from './useMyProfile';

/**
 * First-Swap Activation State
 * ---------------------------
 * Drives banners, nudges, post-verify suggestions and reply/celebration
 * moments that push a brand-new user toward their first completed swap
 * within 24–48h of joining.
 *
 * "New user" = zero completed swaps OR has never sent a request yet.
 *
 * Request-sent state lives in localStorage because requests are still
 * mock-only in this build; once the real `care_requests` insert is wired
 * we can swap that out for a query without touching consumers.
 */
const FLAGS = {
  requestSent: 'petswap.firstSwap.requestSent.v1',
  bannerDismissed: 'petswap.firstSwap.bannerDismissed.v1',
  suggestPending: 'petswap.firstSwap.suggestPending.v1',
  suggestShown: 'petswap.firstSwap.suggestShown.v1',
  firstReplyShown: 'petswap.firstSwap.firstReplyShown.v1',
  firstSwapShown: 'petswap.firstSwap.firstSwapShown.v1',
  prevSwaps: 'petswap.firstSwap.prevSwaps.v1',
} as const;

const readFlag = (k: string): boolean => {
  try { return localStorage.getItem(k) === '1'; } catch { return false; }
};
const setFlag = (k: string, v: boolean) => {
  try { v ? localStorage.setItem(k, '1') : localStorage.removeItem(k); } catch { /* ignore */ }
};

export const markRequestSent = () => setFlag(FLAGS.requestSent, true);
export const markSuggestPending = () => setFlag(FLAGS.suggestPending, true);
export const consumeSuggestPending = (): boolean => {
  const pending = readFlag(FLAGS.suggestPending);
  if (pending) setFlag(FLAGS.suggestPending, false);
  return pending;
};

export const useFirstSwapState = (userId: string | null | undefined) => {
  const { profile } = useMyProfile(userId);
  const completedSwaps = profile?.completed_swaps ?? 0;

  const [hasSentRequest, setHasSentRequest] = useState(() => readFlag(FLAGS.requestSent));
  const [bannerDismissed, setBannerDismissed] = useState(() => readFlag(FLAGS.bannerDismissed));

  // Re-sync flags when localStorage changes elsewhere (cross-tab + same-tab via storage event).
  useEffect(() => {
    const onStorage = () => {
      setHasSentRequest(readFlag(FLAGS.requestSent));
      setBannerDismissed(readFlag(FLAGS.bannerDismissed));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('petswap:firstswap-changed', onStorage as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('petswap:firstswap-changed', onStorage as EventListener);
    };
  }, []);

  // Detect first-swap completion: 0 → 1 transition fires a one-time celebration.
  useEffect(() => {
    if (!profile) return;
    let prev = 0;
    try { prev = Number(localStorage.getItem(FLAGS.prevSwaps) ?? '0'); } catch { /* ignore */ }
    if (prev === 0 && completedSwaps >= 1 && !readFlag(FLAGS.firstSwapShown)) {
      setFlag(FLAGS.firstSwapShown, true);
      try {
        window.dispatchEvent(new CustomEvent('petswap:first-swap-completed'));
        window.dispatchEvent(new CustomEvent('petswap:celebrate'));
      } catch { /* ignore */ }
    }
    try { localStorage.setItem(FLAGS.prevSwaps, String(completedSwaps)); } catch { /* ignore */ }
  }, [profile, completedSwaps]);

  const isNewUser = completedSwaps === 0 || !hasSentRequest;

  const dismissBanner = useCallback(() => {
    setFlag(FLAGS.bannerDismissed, true);
    setBannerDismissed(true);
  }, []);

  const markSent = useCallback(() => {
    markRequestSent();
    setHasSentRequest(true);
    try { window.dispatchEvent(new CustomEvent('petswap:firstswap-changed')); } catch { /* ignore */ }
  }, []);

  return {
    isNewUser,
    completedSwaps,
    hasSentRequest,
    bannerDismissed,
    showHomeBanner: isNewUser && !bannerDismissed,
    dismissBanner,
    markSent,
  };
};

export const FIRST_SWAP_FLAGS = FLAGS;
