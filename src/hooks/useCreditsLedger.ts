/**
 * Credits ledger hook — reads from get_credit_summary + list_credit_transactions.
 * Real data only: shows zeros and an empty list when the user is not signed in
 * or has no credit history yet. No mock fallback — pre-launch trust.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CreditSummary {
  balance: number;
  earned: number;
  spent: number;
  bonus: number;
}

export interface CreditTx {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund' | 'pending_hold' | 'release_hold';
  reason:
    | 'swap_completed'
    | 'referral_bonus'
    | 'signup_bonus'
    | 'daily_login'
    | 'premium_boost'
    | 'request_posted'
    | 'request_cancelled'
    | 'manual_adjustment';
  description: string | null;
  balance_after: number;
  created_at: string;
}

const ZERO_SUMMARY: CreditSummary = { balance: 0, earned: 0, spent: 0, bonus: 0 };

export const useCreditsLedger = () => {
  const [summary, setSummary] = useState<CreditSummary>(ZERO_SUMMARY);
  const [transactions, setTransactions] = useState<CreditTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) {
        if (!active) return;
        setAuthed(false);
        setSummary(ZERO_SUMMARY);
        setTransactions([]);
        setLoading(false);
        return;
      }
      setAuthed(true);
      const [summaryRes, txRes] = await Promise.all([
        supabase.rpc('get_credit_summary', { _user_id: uid }),
        supabase.rpc('list_credit_transactions', { _limit: 50 }),
      ]);
      if (!active) return;
      if (summaryRes.data && typeof summaryRes.data === 'object') {
        setSummary({ ...ZERO_SUMMARY, ...(summaryRes.data as Partial<CreditSummary>) });
      } else {
        setSummary(ZERO_SUMMARY);
      }
      setTransactions((txRes.data as CreditTx[] | null) ?? []);
      setLoading(false);
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setLoading(true); load(); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { summary, transactions, loading, authed };
};
