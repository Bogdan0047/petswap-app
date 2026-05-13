import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export interface SubscriptionState {
  loading: boolean;
  isActive: boolean; // includes grace period
  isTrustedPlus: boolean; // active or trialing now
  hasBoost: boolean;
  plan: "free" | "monthly" | "yearly";
  subscription: SubscriptionRow | null;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [hasBoost, setHasBoost] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setHasBoost(false);
      setLoading(false);
      return;
    }
    const env = getStripeEnvironment();
    const [{ data: sub }, { data: boostRow }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id,status,price_id,current_period_end,cancel_at_period_end,environment")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("boost_purchases")
        .select("expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setSubscription((sub as SubscriptionRow) ?? null);
    setHasBoost(!!boostRow);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Realtime: any subscription change for this user → refetch.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`subs:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boost_purchases", filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  const now = Date.now();
  const periodEndMs = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;

  const isActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) &&
      (periodEndMs === null || periodEndMs > now)) ||
    (subscription.status === "canceled" && periodEndMs !== null && periodEndMs > now)
  );
  const isTrustedPlus = isActive;

  const plan: "free" | "monthly" | "yearly" =
    isActive && subscription?.price_id === "trusted_plus_yearly"
      ? "yearly"
      : isActive && subscription?.price_id === "trusted_plus_monthly"
        ? "monthly"
        : "free";

  return { loading, isActive, isTrustedPlus, hasBoost, plan, subscription, refresh: load };
}
