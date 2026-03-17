import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planType: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionStatus: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
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
      const billingCycle = priceItem.recurring?.interval || null;
      const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
      logStep("Active subscription found", { subscriptionId: subscription.id, planType, status: subscriptionStatus, billingCycle, cancelAtPeriodEnd });

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
    } else {
      logStep("No active subscription found");
    }

    // Extract billing cycle and cancel info from the active sub
    const activeSub = hasActiveSub ? subscriptions.data[0] : null;
    const resBillingCycle = activeSub?.items?.data?.[0]?.price?.recurring?.interval || null;
    const resCancelAtPeriodEnd = activeSub?.cancel_at_period_end || false;

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: planType,
      subscription_end: subscriptionEnd,
      subscription_status: subscriptionStatus,
      stripe_subscription_id: stripeSubscriptionId,
      billing_cycle: resBillingCycle,
      cancel_at_period_end: resCancelAtPeriodEnd,
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
