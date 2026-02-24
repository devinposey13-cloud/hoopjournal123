import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Product ID → plan mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U2TenmJYJtafl8": "starter",
  "prod_U2Te369rDpYwBQ": "starter",
  "prod_U2TeAY16X7k2Ri": "pro",
  "prod_U2TfBflXbqKewl": "pro",
  "prod_U2TfBcoxhUepHK": "elite",
  "prod_U2Tfh9dNymbaRg": "elite",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        if (userId && planId) {
          await supabase.from("plan_overrides").upsert({
            user_id: userId,
            subscription_plan: planId,
            admin_override_plan: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          logStep("Plan updated from checkout", { userId, planId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerEmail = await getCustomerEmail(stripe, subscription.customer as string);
        if (customerEmail) {
          const productId = subscription.items.data[0]?.price?.product as string;
          const planId = PRODUCT_TO_PLAN[productId] || "free";
          const userId = await getUserIdByEmail(supabase, customerEmail);
          if (userId) {
            const isActive = subscription.status === "active" || subscription.status === "trialing";
            await supabase.from("plan_overrides").upsert({
              user_id: userId,
              subscription_plan: isActive ? planId : "free",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            logStep("Subscription updated", { userId, planId, status: subscription.status });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerEmail = await getCustomerEmail(stripe, subscription.customer as string);
        if (customerEmail) {
          const userId = await getUserIdByEmail(supabase, customerEmail);
          if (userId) {
            await supabase.from("plan_overrides").upsert({
              user_id: userId,
              subscription_plan: "free",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            logStep("Subscription canceled, reverted to free", { userId });
          }
        }
        break;
      }

      case "invoice.paid": {
        logStep("Invoice paid", { invoiceId: (event.data.object as any).id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("Error processing webhook", { error: err instanceof Error ? err.message : String(err) });
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return (customer as Stripe.Customer).email || null;
  } catch {
    return null;
  }
}

async function getUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers();
  const user = data?.users?.find((u: any) => u.email === email);
  return user?.id || null;
}
