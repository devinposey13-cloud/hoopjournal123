import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApprovalEmailRequest {
  userId: string;
  email: string;
  username?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authorization token");
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { userId, email, username }: ApprovalEmailRequest = await req.json();

    if (!userId || !email) {
      throw new Error("User ID and email are required");
    }

    // Get the app URL from the request origin or fall back
    const origin = req.headers.get("origin") || "https://hoopjournal.me";
    const appUrl = origin;

    // Send approval email via Resend
    const resend = new Resend(RESEND_API_KEY);
    
    const displayName = username || "Player";
    
    const emailResult = await resend.emails.send({
      from: "Hoop Journal <noreply@hoopjournal.me>",
      to: [email],
      subject: "🎉 Your Hoop Journal Account Has Been Approved!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%); border-radius: 16px; border: 1px solid #2a2a2a;">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <!-- Logo/Header -->
              <div style="margin-bottom: 24px;">
                <img src="https://hoopjournal.me/hoop-journal-logo.png" alt="Hoop Journal" style="height: 60px; width: auto;">
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">Welcome to the Team!</h1>
              <p style="color: #f97316; font-size: 16px; font-weight: 600; margin: 0 0 32px 0;">Your account has been approved</p>
              
              <!-- Main Content -->
              <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left;">
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                  Hey ${displayName}! 👋
                </p>
                <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                  Great news! Your Hoop Journal account has been reviewed and approved. You now have full access to all features:
                </p>
                <ul style="color: #a0a0a0; font-size: 14px; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;">
                  <li>📊 Track your game stats</li>
                  <li>🎬 Upload highlight clips</li>
                  <li>🏆 Earn badges and milestones</li>
                  <li>🤖 Chat with Coach AI</li>
                  <li>📅 Manage your game schedule</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3); margin-bottom: 24px;">
                Open Hoop Journal
              </a>
              
              <!-- Motivational Message -->
              <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="color: #666666; font-size: 14px; font-style: italic; margin: 0;">
                  "The only way to prove you're a good sport is to lose." — Ernie Banks
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Hoop Journal. Keep grinding! 💪
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Approval email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Approval email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-approval-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
