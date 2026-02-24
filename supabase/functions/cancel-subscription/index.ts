import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
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
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { immediate } = await req.json().catch(() => ({ immediate: false }));

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const customerId = customers.data[0].id;

    // Find active or trialing subscription
    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const trialSubs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
    const allSubs = [...activeSubs.data, ...trialSubs.data];

    if (allSubs.length === 0) throw new Error("No active subscription found");

    const subscription = allSubs[0];
    logStep("Found subscription", { id: subscription.id, status: subscription.status });

    if (immediate) {
      // Cancel immediately
      const canceled = await stripe.subscriptions.cancel(subscription.id);
      logStep("Subscription canceled immediately", { id: canceled.id });

      // Update plan_overrides to free
      await supabaseClient.from("plan_overrides").upsert({
        user_id: user.id,
        subscription_plan: "free",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        success: true,
        canceled_immediately: true,
        message: "Your subscription has been canceled.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Cancel at period end
      const updated = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
      });
      logStep("Subscription set to cancel at period end", { id: updated.id });

      return new Response(JSON.stringify({
        success: true,
        canceled_immediately: false,
        cancel_at: new Date(updated.current_period_end * 1000).toISOString(),
        message: "Your subscription will be canceled at the end of the current billing period.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
