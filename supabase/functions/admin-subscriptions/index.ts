import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Verify admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all trialing subscriptions
    const trialingSubs = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
      expand: ["data.customer"],
    });

    // Fetch all active subscriptions
    const activeSubs = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    });

    const safeDate = (val: any): string | null => {
      if (!val) return null;
      try {
        // Handle both unix timestamps and date strings
        if (typeof val === 'number') {
          return new Date(val * 1000).toISOString();
        }
        if (typeof val === 'string') {
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        }
        return null;
      } catch {
        return null;
      }
    };

    const formatSub = (sub: Stripe.Subscription) => {
      const customer = sub.customer as Stripe.Customer;
      const productId = sub.items.data[0]?.price?.product as string;
      return {
        id: sub.id,
        customer_email: customer?.email || "unknown",
        customer_name: customer?.name || null,
        plan: PRODUCT_TO_PLAN[productId] || "unknown",
        status: sub.status,
        current_period_start: safeDate(sub.current_period_start),
        current_period_end: safeDate(sub.current_period_end),
        trial_start: safeDate(sub.trial_start),
        trial_end: safeDate(sub.trial_end),
        cancel_at_period_end: sub.cancel_at_period_end,
        created: safeDate(sub.created),
      };
    };

    const trials = trialingSubs.data.map(formatSub);
    const active = activeSubs.data.map(formatSub);

    return new Response(JSON.stringify({
      trials,
      active,
      trial_count: trials.length,
      active_count: active.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
