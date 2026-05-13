import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Read the signed-in user's referral code from public_profile_view. */
export const useMyReferralCode = (userId: string | null | undefined) => {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) {
      setCode(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('public_profile_view')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCode((data?.referral_code as string | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return code;
};

/** Count of credited referrals for the signed-in user. */
export const useReferralStats = (userId: string | null | undefined) => {
  const [stats, setStats] = useState({ credited: 0, pending: 0 });
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('referrals')
      .select('status')
      .eq('inviter_id', userId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStats({
          credited: data.filter(r => r.status === 'credited').length,
          pending: data.filter(r => r.status === 'pending').length,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return stats;
};

export const buildShareLink = (code: string | null): string => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://petswap.co.uk';
  if (!code) return base;
  // Phase 3: clean /invite/:code link — InviteLanding captures the code
  // into localStorage and forwards to /auth?mode=signup or /home.
  return `${base}/invite/${encodeURIComponent(code)}`;
};

export const buildShareMessage = (code: string | null): string =>
  `I stopped paying for pet sitters 🐾  I use PetSwap to swap pet care for free.  Join here: ${buildShareLink(code)}`;

/** Try native share, fall back to clipboard. */
export const sharePetSwap = async (code: string | null): Promise<'shared' | 'copied'> => {
  const text = buildShareMessage(code);
  const url = buildShareLink(code);
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: 'Join me on PetSwap', text, url });
      return 'shared';
    } catch {
      // user dismissed — fall through to copy
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
};

/**
 * Capture a referral code at app boot. Supports both the legacy `?ref=CODE`
 * query string AND the new `/invite/:code` path so old shared links keep
 * working. The InviteLanding route also captures and redirects.
 */
export const captureReferralFromUrl = (): void => {
  if (typeof window === 'undefined') return;
  let ref: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    ref = params.get('ref');
    if (!ref) {
      const m = window.location.pathname.match(/^\/invite\/([^/?#]+)/i);
      if (m) ref = decodeURIComponent(m[1]);
    }
  } catch { return; }
  if (ref) {
    try {
      localStorage.setItem('petswap.referral', ref.toUpperCase());
    } catch {
      /* ignore */
    }
  }
};

/** Called immediately after signup to redeem any pending referral. */
export const redeemPendingReferral = async (): Promise<void> => {
  let code: string | null = null;
  try {
    code = localStorage.getItem('petswap.referral');
  } catch {
    return;
  }
  if (!code) return;
  const { error } = await supabase.rpc('redeem_referral', { _code: code });
  if (!error) {
    try {
      localStorage.removeItem('petswap.referral');
    } catch {
      /* ignore */
    }
  }
};
