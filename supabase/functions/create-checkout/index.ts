import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Plan → price ID mapping
// Promo users get charged Pro prices (starter maps to pro)
const PLAN_PRICES: Record<string, Record<string, string>> = {
  starter: {
    monthly: "price_1TBe0sRmEndXycaGjFaOW8im",
    yearly: "price_1TBe1aRmEndXycaGfoa8Xdtp",
  },
  pro: {
    monthly: "price_1TBe0sRmEndXycaGjFaOW8im",
    yearly: "price_1TBe1aRmEndXycaGfoa8Xdtp",
  },
  elite: {
    monthly: "price_1TBe2FRmEndXycaGOWO18p6O",
    yearly: "price_1TBe2XRmEndXycaG6TZW3emn",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planId, billingCycle, cancelUrl: reqCancelUrl, source } = await req.json();
    logStep("Request body", { planId, billingCycle, cancelUrl: reqCancelUrl, source });

    // Check if user has promo eligibility — if so, always charge Starter price
    let effectivePlanId = planId;
    const { data: promoData } = await supabaseClient
      .from('plan_overrides')
      .select('promo_eligible, promo_locked_in, promo_type')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasPromo = promoData?.promo_eligible && promoData?.promo_type === 'AAU_MARCH_2026_ELITE_LOCK';
    if (hasPromo && planId !== 'free') {
      effectivePlanId = 'starter';
      logStep("Promo active — overriding price to Starter", { originalPlan: planId });
    }

    // Resolve price ID
    let priceId: string;
    if (effectivePlanId && billingCycle && PLAN_PRICES[effectivePlanId]?.[billingCycle]) {
      priceId = PLAN_PRICES[effectivePlanId][billingCycle];
    } else if (effectivePlanId && PLAN_PRICES[effectivePlanId]) {
      priceId = PLAN_PRICES[effectivePlanId].monthly;
    } else {
      throw new Error(`Invalid planId "${planId}" or billingCycle "${billingCycle}"`);
    }
    logStep("Resolved price ID", { priceId, effectivePlanId, originalPlan: planId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://hoopjournal123.lovable.app";

    // Trial configuration (matches client-side trialConfigs)
    const TRIAL_PLANS: Record<string, number> = {
      pro: 3,    // 3-day trial for Pro
      starter: 3, // starter maps to Pro
    };

    const trialDays = TRIAL_PLANS[effectivePlanId] ?? 0;

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: source === 'onboarding'
        ? `${origin}/onboarding/finish?success=true`
        : `${origin}/settings/billing?success=true`,
      cancel_url: reqCancelUrl || (source === 'onboarding'
        ? `${origin}/pricing?canceled=true`
        : `${origin}/pricing?canceled=true`),
      metadata: { user_id: user.id, plan_id: planId, has_trial: trialDays > 0 ? 'true' : 'false' },
    };

    // Add trial period if eligible (Stripe handles eligibility — only one trial per customer)
    if (trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
      };
      logStep("Trial enabled", { trialDays, effectivePlanId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url, trialDays });

    return new Response(JSON.stringify({ url: session.url }), {
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
