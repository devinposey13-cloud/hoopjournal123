import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESET-TRIAL-ELIGIBILITY] ${step}${detailsStr}`);
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

    // Authenticate the admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) throw new Error("Authentication failed");

    const adminUser = userData.user;
    logStep("Admin authenticated", { adminId: adminUser.id });

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      logStep("Permission denied — not an admin", { userId: adminUser.id });
      throw new Error("Permission denied: admin role required");
    }

    // Parse request body
    const { targetUserId, reasonCategory, additionalNote } = await req.json();
    if (!targetUserId) throw new Error("targetUserId is required");
    if (!reasonCategory) throw new Error("reasonCategory is required");

    logStep("Request params", { targetUserId, reasonCategory });

    // Get target user email from approval requests
    const { data: approvalData } = await supabase
      .from("account_approval_requests")
      .select("email")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const targetEmail = approvalData?.email || null;

    // Get current plan_overrides for the target user
    const { data: currentOverride } = await supabase
      .from("plan_overrides")
      .select("trial_eligible, trial_eligibility_reset_count")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const previousTrialEligible = currentOverride?.trial_eligible ?? true;
    const resetCountBefore = currentOverride?.trial_eligibility_reset_count ?? 0;
    const newResetCount = resetCountBefore + 1;

    logStep("Current state", { previousTrialEligible, resetCountBefore });

    // Update plan_overrides
    const updatePayload = {
      trial_eligible: true,
      trial_eligibility_reset_count: newResetCount,
      last_trial_reset_at: new Date().toISOString(),
      last_trial_reset_by: adminUser.id,
      last_trial_reset_reason: reasonCategory,
      updated_at: new Date().toISOString(),
      updated_by: adminUser.id,
    };

    let success = true;
    let errorDetails: string | null = null;

    try {
      if (currentOverride) {
        const { error } = await supabase
          .from("plan_overrides")
          .update(updatePayload)
          .eq("user_id", targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plan_overrides")
          .insert({ user_id: targetUserId, ...updatePayload, subscription_plan: "free" });
        if (error) throw error;
      }
      logStep("Trial eligibility reset successfully");
    } catch (err) {
      success = false;
      errorDetails = err instanceof Error ? err.message : String(err);
      logStep("Failed to update plan_overrides", { error: errorDetails });
    }

    // Write audit log (always, even on failure)
    try {
      await supabase.from("admin_trial_reset_log").insert({
        target_user_id: targetUserId,
        target_user_email: targetEmail,
        admin_user_id: adminUser.id,
        admin_email: adminUser.email,
        reason_category: reasonCategory,
        additional_note: additionalNote || null,
        previous_trial_eligible: previousTrialEligible,
        new_trial_eligible: success ? true : previousTrialEligible,
        reset_count_before: resetCountBefore,
        reset_count_after: success ? newResetCount : resetCountBefore,
        success,
        error_details: errorDetails,
      });
      logStep("Audit log written");
    } catch (auditErr) {
      logStep("WARNING: Failed to write audit log", { error: String(auditErr) });
    }

    if (!success) {
      throw new Error(errorDetails || "Failed to reset trial eligibility");
    }

    return new Response(JSON.stringify({
      success: true,
      trial_eligible: true,
      reset_count: newResetCount,
      message: "Trial eligibility reset successfully",
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
