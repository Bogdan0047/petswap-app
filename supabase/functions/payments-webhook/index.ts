import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

const fmtDate = (s: number | null | undefined) =>
  s ? new Date(s * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined;

async function sendEmail(userId: string, emailType: string, dedupeKey: string, templateData: Record<string, unknown>) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    await fetch(`${supabaseUrl}/functions/v1/send-petswap-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnon}`,
        "apikey": supabaseAnon,
      },
      body: JSON.stringify({ user_id: userId, email_type: emailType, dedupe_key: dedupeKey, template_data: templateData }),
    });
  } catch (e) {
    console.error(`[payments-webhook] failed to send ${emailType}`, e);
  }
}

async function findUserIdByCustomer(customerId: string, env: StripeEnv): Promise<string | null> {
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .eq("environment", env)
    .limit(1)
    .maybeSingle();
  return (data as any)?.user_id ?? null;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  const trigger = subscription.metadata?.trigger ?? "manual";
  await getSupabase().from("paywall_events").insert({
    user_id: userId,
    trigger,
    action: "subscribed",
    price_id: priceId,
    metadata: { subscription_id: subscription.id, environment: env },
  });

  // Only send emails in LIVE mode
  if (env !== "live") return;

  const isYearly = priceId === "trusted_plus_yearly";
  const amountLabel = isYearly ? "£39.99 / year" : "£4.99 / month";
  const planLabel = isYearly ? "PetSwap Premium (Yearly)" : "PetSwap Premium (Monthly)";

  // Welcome email — one-time per user (dedupe by userId, not subscription)
  await sendEmail(userId, "subscription-welcome", `welcome-${userId}`, {
    appUrl: "https://petswap.co.uk",
  });

  // Confirmation email — per subscription
  await sendEmail(userId, "subscription-confirmation", `sub-confirm-${subscription.id}`, {
    planLabel,
    amountLabel,
    startDate: fmtDate(periodStart),
    nextBillingDate: fmtDate(periodEnd),
    manageUrl: "https://petswap.co.uk/subscription",
  });
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (env !== "live") return;

  const userId = subscription.metadata?.userId ?? (await findUserIdByCustomer(subscription.customer, env));
  if (!userId) return;
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end ?? subscription.cancel_at;

  await sendEmail(userId, "subscription-cancelled", `sub-cancel-${subscription.id}`, {
    endDate: fmtDate(periodEnd),
    appUrl: "https://petswap.co.uk",
  });
}

async function handleInvoicePaymentSucceeded(invoice: any, env: StripeEnv) {
  if (env !== "live") return;
  if (!invoice.subscription && !invoice.customer) return;

  const userId = await findUserIdByCustomer(invoice.customer, env);
  if (!userId) return;

  const amount = ((invoice.amount_paid ?? 0) / 100).toFixed(2);
  const paymentDate = fmtDate(invoice.created);
  const card = invoice.charge?.payment_method_details?.card;
  const paymentMethod = card?.brand
    ? `${card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• ${card.last4}`
    : "Card";

  await sendEmail(userId, "subscription-receipt", `receipt-${invoice.id}`, {
    amount,
    paymentDate,
    paymentMethod,
    manageUrl: "https://petswap.co.uk/subscription",
  });
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Boost (one-time payment)
  if (session.mode === "payment") {
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;
    if (!userId || priceId !== "boost_24h") return;

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await getSupabase().from("boost_purchases").upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        amount_cents: session.amount_total ?? 299,
        currency: session.currency ?? "gbp",
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        environment: env,
      },
      { onConflict: "stripe_session_id" },
    );

    await getSupabase().from("paywall_events").insert({
      user_id: userId,
      trigger: session.metadata?.trigger ?? "boost_cta",
      action: "subscribed",
      price_id: priceId,
      metadata: { session_id: session.id, environment: env, boost: true },
    });
  }
  // Subscription confirmation emails are sent from customer.subscription.created
  // to ensure subscription/period data is available.
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv as StripeEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
