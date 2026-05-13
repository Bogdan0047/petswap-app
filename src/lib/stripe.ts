// Use the "/pure" entry so Stripe.js is NOT auto-injected on import.
// The script tag is only added when loadStripe() is actually called
// (i.e. on checkout / subscription flows), keeping FCP fast everywhere else.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = (import.meta as any).env?.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

export function isTestMode(): boolean {
  return environment === "sandbox";
}

// Canonical price IDs created in Stripe (see payments--batch_create_product).
export const PRICE_IDS = {
  monthly: "trusted_plus_monthly",
  yearly: "trusted_plus_yearly",
  boost24h: "boost_24h",
} as const;

export const PRICES_DISPLAY = {
  monthly: "£4.99/month",
  yearly: "£39.99/year",
  boost24h: "£2.99",
} as const;
