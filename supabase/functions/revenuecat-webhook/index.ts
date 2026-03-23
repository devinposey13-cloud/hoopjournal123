import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVENUECAT-WEBHOOK] ${step}${detailsStr}`);
};

// RevenueCat product ID → internal plan mapping (current App Store product IDs)
const RC_PRODUCT_TO_PLAN: Record<string, string> = {
  HoopJ_pro_monthly: "pro",
  HoopJ_pro_yearly: "pro",
  HoopJ_elite_monthly: "elite",
  HoopJ_elite_yearly: "elite",
  hj_starter_monthly: "pro",
  hj_starter_yearly: "pro",
  hj_pro_monthly: "pro",
  hj_pro_yearly: "pro",
  hj_elite_monthly: "elite",
  hj_elite_yearly: "elite",
  monthly: "pro",
  yearly: "pro",
  lifetime: "elite",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  // Validate webhook auth header
  const authKey = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_KEY");
  if (!authKey) {
    logStep("ERROR", { message: "REVENUECAT_WEBHOOK_AUTH_KEY not set" });
    return new Response("Server configuration error", { status: 500 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${authKey}`) {
    logStep("Unauthorized webhook request");
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = body?.event;
  if (!event) {
    return new Response("Missing event", { status: 400 });
  }

  const eventType = event.type;
  const appUserId = event.app_user_id; // This is the Supabase user ID we set during logIn()
  const productId = event.product_id;

  logStep("Event received", { type: eventType, appUserId, productId });

  if (!appUserId) {
    logStep("No app_user_id, skipping");
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION": {
        const planId = RC_PRODUCT_TO_PLAN[productId] || null;
        if (!planId) {
          logStep("Unknown product, skipping", { productId });
          break;
        }

        await supabase.from("plan_overrides").upsert({
          user_id: appUserId,
          subscription_plan: planId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        logStep("Plan activated", { userId: appUserId, planId });

        break;
      }

      case "CANCELLATION":
      case "EXPIRATION": {
        // Revert to free but preserve promo lock
        await supabase.from("plan_overrides").update({
          subscription_plan: "free",
          updated_at: new Date().toISOString(),
        }).eq("user_id", appUserId);

        logStep("Subscription ended, reverted to free", { userId: appUserId });
        break;
      }

      case "BILLING_ISSUE": {
        logStep("Billing issue detected", { userId: appUserId, productId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: eventType });
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
