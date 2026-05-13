import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate caller and verify userId matches.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await callerClient.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const priceId = String(body?.priceId ?? "");
    const returnUrl = String(body?.returnUrl ?? "");
    const customerEmail: string | undefined = body?.customerEmail;
    const userId: string | undefined = body?.userId;
    const trigger: string | undefined = body?.trigger;
    const env: StripeEnv = body?.environment === "live" ? "live" : "sandbox";

    if (userId && userId !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (!returnUrl || !/^https?:\/\//.test(returnUrl)) throw new Error("Invalid returnUrl");

    const stripe = createStripeClient(env);

    // Accept either a raw Stripe price id ("price_xxx") or a human-readable lookup key.
    let stripePrice;
    if (priceId.startsWith("price_")) {
      stripePrice = await stripe.prices.retrieve(priceId);
    } else {
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      stripePrice = prices.data[0];
    }
    const isRecurring = stripePrice.type === "recurring";

    // Ensure the product has a tax_code (required by Managed Payments).
    // SaaS for subscriptions, general digital goods for one-time purchases.
    const productId = typeof stripePrice.product === "string"
      ? stripePrice.product
      : stripePrice.product?.id;
    if (productId) {
      const product = await stripe.products.retrieve(productId);
      if (!product.tax_code) {
        await stripe.products.update(productId, {
          tax_code: isRecurring ? "txcd_10103001" : "txcd_10000000",
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      managed_payments: { enabled: true } as any,
      ...(customerEmail && { customer_email: customerEmail }),
      ...(userId && {
        metadata: {
          userId,
          priceId,
          trigger: trigger ?? "manual",
          managed_payments: "true",
        },
      }),
      ...(isRecurring && userId && {
        subscription_data: {
          metadata: { userId, priceId, trigger: trigger ?? "manual" },
        },
      }),
    });

    // Track paywall conversion attempt
    if (userId) {
      await supabase.from("paywall_events").insert({
        user_id: userId,
        trigger: trigger ?? "manual",
        action: "cta_click",
        price_id: priceId,
        metadata: { session_id: session.id, environment: env },
      });
    }

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
