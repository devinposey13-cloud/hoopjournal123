import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product ID → plan mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  // Legacy products (mapped to current tiers for existing subscribers)
  "prod_U2TenmJYJtafl8": "pro",
  "prod_U2Te369rDpYwBQ": "pro",
  "prod_U2TeAY16X7k2Ri": "pro",
  "prod_U2TfBflXbqKewl": "pro",
  "prod_U2TfBcoxhUepHK": "elite",
  "prod_U2Tfh9dNymbaRg": "elite",
  // Current products
  "prod_U9xw8HkikJdDCE": "pro",
  "prod_U9xxiVNpQ9FA09": "pro",
  "prod_U9xyJGOw7lBgaD": "elite",
  "prod_U9xynfg4pfxwun": "elite",
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let hasStripeSub = false;
    let planType: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionStatus: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let resBillingCycle: string | null = null;
    let resCancelAtPeriodEnd = false;
    let billingSource: string | null = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      // Check active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      // Also check trialing subscriptions
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });

      const allSubs = [...subscriptions.data, ...trialingSubs.data];
      hasStripeSub = allSubs.length > 0;

      if (hasStripeSub) {
        const subscription = allSubs[0];
        const periodEnd = subscription.current_period_end;
        try {
          subscriptionEnd = typeof periodEnd === 'number' 
            ? new Date(periodEnd * 1000).toISOString()
            : typeof periodEnd === 'string' 
              ? new Date(periodEnd).toISOString()
              : null;
        } catch {
          subscriptionEnd = null;
        }
        subscriptionStatus = subscription.status;
        stripeSubscriptionId = subscription.id;

        const priceItem = subscription.items.data[0].price;
        const productId = priceItem.product as string;
        planType = PRODUCT_TO_PLAN[productId] || "pro";
        resBillingCycle = priceItem.recurring?.interval || null;
        resCancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        billingSource = "stripe";
        logStep("Active Stripe subscription found", { subscriptionId: subscription.id, planType, status: subscriptionStatus, billingCycle: resBillingCycle, cancelAtPeriodEnd: resCancelAtPeriodEnd });

        // Sync to plan_overrides
        const { error: upsertError } = await supabaseClient
          .from("plan_overrides")
          .upsert({
            user_id: user.id,
            subscription_plan: planType,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) {
          logStep("Warning: failed to sync plan_overrides", { error: upsertError.message });
        }
      }
    }

    // If no Stripe subscription, check plan_overrides for RevenueCat/App Store or admin override
    if (!hasStripeSub) {
      logStep("No Stripe subscription, checking plan_overrides for native/admin subscription");
      const { data: overrideData } = await supabaseClient
        .from("plan_overrides")
        .select("subscription_plan, admin_override_plan, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (overrideData) {
        // Admin override takes priority
        const effectivePlan = overrideData.admin_override_plan || overrideData.subscription_plan;
        if (effectivePlan && effectivePlan !== "free") {
          planType = effectivePlan;
          subscriptionStatus = "active";
          // If admin_override_plan is set, this is an admin grant — not App Store
          // Only assume ios_app_store if there's no admin override (i.e., set by RevenueCat webhook)
          billingSource = overrideData.admin_override_plan ? null : "ios_app_store";
          logStep("Found subscription in plan_overrides", { planType, billingSource, adminOverride: !!overrideData.admin_override_plan });
        } else {
          logStep("No active subscription found anywhere");
        }
      } else {
        logStep("No plan_overrides record found");
      }
    }

    const subscribed = hasStripeSub || (billingSource === "ios_app_store");

    return new Response(JSON.stringify({
      subscribed,
      plan_type: planType,
      subscription_end: subscriptionEnd,
      subscription_status: subscriptionStatus,
      stripe_subscription_id: stripeSubscriptionId,
      billing_cycle: resBillingCycle,
      cancel_at_period_end: resCancelAtPeriodEnd,
      billing_source: billingSource,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
