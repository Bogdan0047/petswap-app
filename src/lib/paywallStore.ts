import { useSyncExternalStore } from "react";

export type PaywallTrigger =
  | "match_limit"
  | "post_booking"
  | "chat_momentum"
  | "boost_cta"
  | "filters"
  | "priority"
  | "manual";

/** A/B variant assigned per device, persisted in localStorage. */
export type PaywallVariant = "A" | "B" | "C";

const VARIANT_KEY = "petswap.paywall.variant.v1";

export function getPaywallVariant(): PaywallVariant {
  try {
    const existing = localStorage.getItem(VARIANT_KEY) as PaywallVariant | null;
    if (existing === "A" || existing === "B" || existing === "C") return existing;
    const variants: PaywallVariant[] = ["A", "B", "C"];
    const pick = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(VARIANT_KEY, pick);
    return pick;
  } catch {
    return "A";
  }
}

interface PaywallState {
  open: boolean;
  trigger: PaywallTrigger;
  directPriceId?: string;
  headline?: string;
  sub?: string;
}

let state: PaywallState = { open: false, trigger: "manual" };
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

export function openPaywall(opts: {
  trigger: PaywallTrigger;
  directPriceId?: string;
  headline?: string;
  sub?: string;
}) {
  state = { open: true, ...opts };
  emit();
}

export function closePaywall() {
  state = { ...state, open: false, directPriceId: undefined };
  emit();
}

export function usePaywallState(): PaywallState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => state,
  );
}

/** Per-trigger throttle so we never spam the same paywall. */
const THROTTLE_KEY = "petswap.paywall.lastShown.v1";
const THROTTLE_MS: Record<PaywallTrigger, number> = {
  match_limit: 0,           // always show — hard gate
  post_booking: 24 * 3600 * 1000,
  chat_momentum: 24 * 3600 * 1000,
  boost_cta: 6 * 3600 * 1000,
  filters: 6 * 3600 * 1000,
  priority: 6 * 3600 * 1000,
  manual: 0,
};

export function shouldShowPaywall(trigger: PaywallTrigger): boolean {
  const ms = THROTTLE_MS[trigger];
  if (!ms) return true;
  try {
    const raw = localStorage.getItem(THROTTLE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    const last = map[trigger] ?? 0;
    if (Date.now() - last < ms) return false;
    map[trigger] = Date.now();
    localStorage.setItem(THROTTLE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return true;
  }
}
