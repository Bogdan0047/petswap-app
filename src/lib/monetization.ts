import { supabase } from "@/integrations/supabase/client";

/** Records a paywall view/interaction for analytics. */
export async function recordPaywallEvent(opts: {
  trigger: "match_limit" | "post_booking" | "chat_momentum" | "boost_cta" | "filters" | "priority" | "manual";
  action?: "view" | "cta_click" | "purchase_started" | "purchase_success" | "subscribed" | "dismissed";
  priceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      user_id: user?.id ?? null,
      trigger: opts.trigger,
      action: opts.action ?? "view",
      price_id: opts.priceId ?? null,
      metadata: (opts.metadata ?? {}) as never,
    };
    await supabase.from("paywall_events").insert(row as never);
  } catch (e) {
    console.warn("paywall event failed", e);
  }
}

/** Free tier daily match limit. */
export const FREE_DAILY_MATCH_LIMIT = 10;

/** Returns true if the user can still make matches today (free tier). */
export async function canMatchToday(isPlus: boolean): Promise<{ allowed: boolean; count: number; limit: number }> {
  if (isPlus) return { allowed: true, count: 0, limit: Infinity };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, count: 0, limit: FREE_DAILY_MATCH_LIMIT };
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("profiles")
    .select("daily_matches_count,daily_matches_reset_at")
    .eq("id", user.id)
    .maybeSingle();
  const count = (data?.daily_matches_reset_at as string | undefined) === today
    ? Number(data?.daily_matches_count ?? 0)
    : 0;
  return { allowed: count < FREE_DAILY_MATCH_LIMIT, count, limit: FREE_DAILY_MATCH_LIMIT };
}

/** Increments today's match counter via RPC. */
export async function incrementDailyMatches(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase.rpc("increment_daily_matches", { _user_id: user.id });
  return Number(data ?? 0);
}
