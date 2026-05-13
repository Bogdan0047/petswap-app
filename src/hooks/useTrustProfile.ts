import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TrustTier } from '@/lib/trust';
import { readTrustCache, writeTrustCache } from '@/lib/trustCache';

export interface TrustProfile {
  score: number;
  tier: TrustTier;
  tierLabel: string;
  completion: number;
  email_verified: boolean;
  phone_verified: boolean;
  id_verified: boolean;
  completed_swaps: number;
  average_rating: number;
  total_reviews: number;
  response_rate: number;
  cancellations: number;
}

type RawTrustRow = Record<string, unknown>;

const tierLabels: Record<TrustTier, string> = {
  trusted: 'Trusted member',
  good: 'Good standing',
  improving: 'Improving',
  low: 'New member',
};

/**
 * Reads the SQL `get_trust_breakdown` for any user id.
 * Returns null while loading or if the user is not signed in / not found.
 */
export const useTrustProfile = (userId: string | undefined | null) => {
  // Hydrate from localStorage so the trust card paints instantly on revisit.
  const [data, setData] = useState<TrustProfile | null>(() =>
    userId ? readTrustCache(userId) : null,
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      return null;
    }
    setLoading(true);
    const { data: row, error } = await supabase.rpc('get_trust_breakdown', { _user_id: userId });
    if (error || !row || typeof row !== 'object' || Object.keys(row as object).length === 0) {
      setData(null);
      setLoading(false);
      return null;
    }
    const r = row as RawTrustRow;
    const tier = (r.tier as TrustTier) ?? 'low';
    const next: TrustProfile = {
      score: Number(r.score ?? 0),
      tier,
      tierLabel: tierLabels[tier] ?? 'New member',
      completion: Number(r.completion ?? 0),
      email_verified: Boolean(r.email_verified),
      phone_verified: false,
      id_verified: false,
      completed_swaps: Number(r.completed_swaps ?? 0),
      average_rating: Number(r.average_rating ?? 0),
      total_reviews: Number(r.total_reviews ?? 0),
      response_rate: Number(r.response_rate ?? 0),
      cancellations: Number(r.cancellations ?? 0),
    };
    setData(next);
    writeTrustCache(userId, next);
    setLoading(false);
    return next;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    // Re-hydrate when userId changes (e.g. after sign-in).
    const cached = readTrustCache(userId);
    if (cached) setData(cached);

    let cancelled = false;
    void refresh().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [userId, refresh]);

  return { data, loading, refresh };
};

/** Returns the currently signed-in user id, or null. */
export const useCurrentUserId = () => {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setId(session?.user?.id ?? null);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
  return id;
};
