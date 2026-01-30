import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordResetRequest {
  email: string;
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

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: check if a reset was requested in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTokens } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("id")
      .eq("email", normalizedEmail)
      .gte("created_at", fiveMinutesAgo)
      .is("used_at", null);

    if (recentTokens && recentTokens.length > 0) {
      // Return success even if rate limited (email enumeration protection)
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up user by email using admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      throw new Error("Failed to process request");
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    // Always return success for email enumeration protection
    if (!user) {
      console.log("No user found for email:", normalizedEmail);
      return new Response(
        JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure random token (32 bytes = 64 hex chars)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Store token with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      throw new Error("Failed to generate reset token");
    }

    // Build reset URL - use the origin from the request or fall back to env
    const origin = req.headers.get("origin") || "https://hoopjournal.me";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Send email via Resend
    const resend = new Resend(RESEND_API_KEY);
    
    const emailResult = await resend.emails.send({
      from: "Hoop Journal <noreply@hoopjournal.me>",
      to: [normalizedEmail],
      subject: "Reset your Hoop Journal password",
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
              <div style="margin-bottom: 32px;">
                <img src="https://hoopjournal.me/hoop-journal-logo.png" alt="Hoop Journal" style="height: 60px; width: auto; margin-bottom: 16px;">
              </div>
              
              <!-- Main Content -->
              <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Reset Your Password</h2>
                <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                  You requested to reset your password for your Hoop Journal account. Click the button below to set a new password.
                </p>
                
                <!-- CTA Button -->
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <!-- Expiry Notice -->
              <p style="color: #666666; font-size: 13px; margin: 0 0 16px 0;">
                ⏱️ This link will expire in <strong style="color: #888888;">1 hour</strong>
              </p>
              
              <!-- Security Notice -->
              <div style="background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #a0a0a0; font-size: 13px; margin: 0; line-height: 1.5;">
                  🔒 If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="color: #666666; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Hoop Journal. All rights reserved.
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

    console.log("Password reset email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-password-reset:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
