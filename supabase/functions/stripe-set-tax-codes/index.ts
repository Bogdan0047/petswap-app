// One-time admin endpoint: assigns the SaaS / digital tax code to PetSwap products.
// Trusted Plus subscription -> txcd_10103001 (SaaS)
// Profile Boost (24h) -> txcd_10000000 (general digital goods)
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

const TAX_CODES: Record<string, string> = {
  trusted_plus: "txcd_10103001",
  profile_boost_24h: "txcd_10000000",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token ?? "");
    if (!user) throw new Error("Unauthorized");
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Admin only");

    const body = await req.json().catch(() => ({}));
    const env: StripeEnv = body?.environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(env);

    const results: Record<string, string> = {};
    for (const [productLookup, taxCode] of Object.entries(TAX_CODES)) {
      // Find the Stripe product whose lovable_external_id matches our lookup.
      const products = await stripe.products.search({
        query: `metadata['lovable_external_id']:'${productLookup}'`,
      });
      const product = products.data[0];
      if (!product) {
        results[productLookup] = "not_found";
        continue;
      }
      await stripe.products.update(product.id, { tax_code: taxCode });
      results[productLookup] = `updated:${taxCode}`;
    }

    return new Response(JSON.stringify({ ok: true, results, environment: env }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("set-tax-codes error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
