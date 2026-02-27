import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***invalid***";
  const masked = local.length > 3 ? local.substring(0, 3) + "***" : "***";
  return `${masked}@${domain}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook received, type:", payload.type);

    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user_id, email, username, status } = payload.record;

    if (status !== "pending") {
      console.log("Skipping non-pending record");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminEmail = "support@hoopjournal.me";

    console.log("Sending admin notification for:", username, email ? maskEmail(email) : "no email");

    const signupTime = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const adminUrl = "https://hoopjournal.me";

    const emailResponse = await resend.emails.send({
      from: "Hoop Journal <noreply@hoopjournal.me>",
      to: [adminEmail],
      subject: `🏀 New Account Request: ${username || "Unknown"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <img src="https://hoopjournal.me/hoop-journal-logo.png" alt="Hoop Journal" style="height: 60px; width: auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 8px;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">New Account Request! 🏀</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">A new player wants to join the team</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #18181b; border-radius: 12px; padding: 24px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Username</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #f97316;">@${username || "Unknown"}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${email || "Not provided"}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Signed Up</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${signupTime} ET</p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <a href="${adminUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                              Review Account Request
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 32px;">
                      <p style="margin: 0; font-size: 12px; color: #52525b;">Hoop Journal Admin Notification</p>
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

    console.log("Admin notification sent:", emailResponse);

    // Mark notification as sent
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase
      .from("account_approval_requests")
      .update({ notification_sent: true })
      .eq("user_id", user_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in handle-signup-webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
