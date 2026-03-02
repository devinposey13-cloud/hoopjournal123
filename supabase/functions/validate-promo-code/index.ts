import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-PROMO] ${step}${detailsStr}`);
};

// Valid promo codes - server-side only
const VALID_PROMOS: Record<string, { type: string; validFrom: string; validUntil: string }> = {
  "AAUELITE2026": {
    type: "AAU_MARCH_2026_ELITE_LOCK",
    validFrom: "2026-03-01T00:00:00Z",
    validUntil: "2026-04-01T00:00:00Z",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Rate limiting - 5 attempts per 5 minutes
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `promo_${user.id}_${clientIp}`;
    const { data: rateResult } = await supabase.rpc("check_rate_limit", {
      p_identifier: rateLimitKey,
      p_action: "validate_promo",
      p_max_attempts: 5,
      p_window_seconds: 300,
      p_block_seconds: 900,
    });

    if (rateResult && !rateResult.allowed) {
      logStep("Rate limited", { userId: user.id, ip: clientIp });
      return new Response(JSON.stringify({ 
        error: "Too many attempts. Please try again later.",
        retryAfter: rateResult.retry_after,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Parse and validate code
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      logStep("Invalid input", { userId: user.id });
      return new Response(JSON.stringify({ error: "Invalid code." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const normalizedCode = code.trim().toUpperCase();
    logStep("Code attempt", { userId: user.id, codeLength: normalizedCode.length });

    // Look up promo
    const promo = VALID_PROMOS[normalizedCode];
    if (!promo) {
      logStep("Invalid code", { userId: user.id });
      return new Response(JSON.stringify({ error: "Invalid event code." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check date validity
    const now = new Date();
    if (now < new Date(promo.validFrom) || now >= new Date(promo.validUntil)) {
      logStep("Code expired or not yet active", { userId: user.id, type: promo.type });
      return new Response(JSON.stringify({ error: "This event code has expired." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if user already has this promo
    const { data: existing } = await supabase
      .from("plan_overrides")
      .select("promo_eligible, promo_locked_in, promo_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.promo_locked_in && existing?.promo_type === promo.type) {
      logStep("Already locked in", { userId: user.id });
      return new Response(JSON.stringify({ error: "You already have this promotion locked in." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (existing?.promo_eligible && existing?.promo_type === promo.type) {
      logStep("Already eligible", { userId: user.id });
      return new Response(JSON.stringify({ 
        success: true,
        message: "You've already applied this event code. Subscribe to Starter this month to lock in Elite access permanently.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Set promo eligible
    const { error: upsertError } = await supabase
      .from("plan_overrides")
      .upsert({
        user_id: user.id,
        promo_eligible: true,
        promo_type: promo.type,
        promo_source: "AAU_SPOKEN_CODE",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      logStep("DB error", { error: upsertError.message });
      throw new Error("Failed to apply promotion.");
    }

    logStep("Promo applied successfully", { userId: user.id, type: promo.type });

    return new Response(JSON.stringify({
      success: true,
      message: "AAU Event Code Applied! Subscribe to Starter this month to lock in Elite access permanently.",
      promoType: promo.type,
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
