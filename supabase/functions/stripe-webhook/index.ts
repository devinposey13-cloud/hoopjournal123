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
          // Check if user is promo-eligible
          const { data: promoData } = await supabase
            .from("plan_overrides")
            .select("promo_eligible, promo_type, promo_locked_in")
            .eq("user_id", userId)
            .maybeSingle();

          const isPromoEligible = promoData?.promo_eligible &&
            promoData?.promo_type === "AAU_MARCH_2026_ELITE_LOCK" &&
            planId !== "free";

          if (isPromoEligible) {
            // Promo user: always set starter billing + lock in Elite access
            await supabase.from("plan_overrides").upsert({
              user_id: userId,
              subscription_plan: "starter",
              promo_locked_in: true,
              promo_start_date: promoData?.promo_locked_in
                ? undefined  // preserve existing start date on resubscription
                : new Date().toISOString(),
              admin_override_plan: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            logStep("Promo lock-in set from checkout", {
              userId, originalPlan: planId, wasAlreadyLocked: promoData?.promo_locked_in
            });
          } else {
            // Normal user: set plan from metadata
            await supabase.from("plan_overrides").upsert({
              user_id: userId,
              subscription_plan: planId,
              admin_override_plan: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            logStep("Plan updated from checkout", { userId, planId });
          }

          // Slack alert for new paid subscription
          fireSlackAlert(supabase, {
            category: 'new_paid_subscription',
            severity: 'info',
            title: `New Paid Subscription: ${planId}`,
            summary: `A user subscribed to the ${planId} plan.`,
            details: { Plan: planId, 'User ID': userId },
            dedup_key: `checkout_${session.id}`,
          });
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
            const isActive = subscription.status === "active";
            await supabase.from("plan_overrides").upsert({
              user_id: userId,
              subscription_plan: isActive ? planId : "free",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            logStep("Subscription updated", { userId, planId, status: subscription.status });

            // AAU promo lock-in check on subscription activation
            if (isActive) {
              await checkAndLockPromo(supabase, userId, planId);
            }
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
            // Keep promo_locked_in = true so it can be restored on resubscription
            await supabase.from("plan_overrides").update({
              subscription_plan: "free",
              updated_at: new Date().toISOString(),
            }).eq("user_id", userId);
            logStep("Subscription canceled, reverted to free (promo lock preserved)", { userId });

            // Slack alert for cancellation
            fireSlackAlert(supabase, {
              category: 'canceled_subscription',
              severity: 'warning',
              title: 'Subscription Canceled',
              summary: `A user's subscription has been canceled and reverted to Free.`,
              details: { 'User ID': userId },
              dedup_key: `cancel_${subscription.id}`,
            });
          }
        }
        break;
      }

      case "invoice.paid": {
        logStep("Invoice paid", { invoiceId: (event.data.object as any).id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerEmail = invoice.customer_email || 'unknown';
        const amountDue = invoice.amount_due ? `$${(invoice.amount_due / 100).toFixed(2)}` : 'unknown';
        logStep("Invoice payment failed", { invoiceId: invoice.id, customerEmail, amountDue });

        fireSlackAlert(supabase, {
          category: 'failed_payment',
          severity: 'critical',
          title: 'Failed Payment',
          summary: `Payment failed for ${customerEmail}. Amount due: ${amountDue}.`,
          details: {
            'Customer Email': customerEmail,
            'Invoice ID': invoice.id,
            'Amount Due': amountDue,
          },
          dedup_key: `failed_payment_${invoice.id}`,
        });
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

/**
 * Check if user is promo-eligible and lock in Elite access
 * when they subscribe to Starter during the promo window.
 */
async function checkAndLockPromo(supabase: any, userId: string, planId: string) {
  if (planId !== "starter") return;

  const { data } = await supabase
    .from("plan_overrides")
    .select("promo_eligible, promo_type, promo_locked_in")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return;

  // Already locked in
  if (data.promo_locked_in) {
    logStep("Promo already locked in", { userId });
    return;
  }

  // Check eligibility
  if (
    data.promo_eligible &&
    data.promo_type === "AAU_MARCH_2026_ELITE_LOCK"
  ) {
    // Verify we're still in March 2026
    const now = new Date();
    const promoStart = new Date("2026-03-01T00:00:00Z");
    const promoEnd = new Date("2026-04-01T00:00:00Z");

    if (now >= promoStart && now < promoEnd) {
      await supabase.from("plan_overrides").update({
        promo_locked_in: true,
        promo_start_date: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("user_id", userId);
      logStep("AAU promo locked in!", { userId });
    } else {
      logStep("Promo window expired, not locking in", { userId });
    }
  }
}

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

async function fireSlackAlert(supabase: any, payload: any) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    await fetch(`${supabaseUrl}/functions/v1/send-slack-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logStep("Slack alert failed (non-blocking)", { error: err instanceof Error ? err.message : String(err) });
  }
}
