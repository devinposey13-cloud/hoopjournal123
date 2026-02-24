import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Plan → price ID mapping
const PLAN_PRICES: Record<string, Record<string, string>> = {
  starter: {
    monthly: "price_1T4OgtRmEndXycaGheeNenUl",
    yearly: "price_1T4Oh8RmEndXycaGDCWstZbx",
  },
  pro: {
    monthly: "price_1T4OhTRmEndXycaGihIBzJ4z",
    yearly: "price_1T4OhiRmEndXycaGTCZ1brsJ",
  },
  elite: {
    monthly: "price_1T4Oi0RmEndXycaGTr3xvLEP",
    yearly: "price_1T4OiMRmEndXycaGvwSVdgYK",
  },
};

// Trial days per plan
const TRIAL_DAYS: Record<string, number> = {
  starter: 7,
  pro: 7,
  elite: 0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    const { planId, billingCycle, withTrial } = await req.json();
    logStep("Request body", { planId, billingCycle, withTrial });

    // Resolve price ID
    let priceId: string;
    if (planId && billingCycle && PLAN_PRICES[planId]?.[billingCycle]) {
      priceId = PLAN_PRICES[planId][billingCycle];
    } else if (planId && PLAN_PRICES[planId]) {
      priceId = PLAN_PRICES[planId].monthly;
    } else {
      throw new Error(`Invalid planId "${planId}" or billingCycle "${billingCycle}"`);
    }
    logStep("Resolved price ID", { priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://hoopjournal123.lovable.app";

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: { user_id: user.id, plan_id: planId },
    };

    // Add trial if applicable
    const trialDays = withTrial !== false ? (TRIAL_DAYS[planId] || 0) : 0;
    if (trialDays > 0) {
      sessionParams.subscription_data = { trial_period_days: trialDays };
      logStep("Adding trial", { trialDays });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
