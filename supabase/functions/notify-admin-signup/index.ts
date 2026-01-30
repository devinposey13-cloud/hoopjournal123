import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignupNotificationRequest {
  username: string;
  email: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    if (!adminEmail) {
      throw new Error("ADMIN_NOTIFICATION_EMAIL not configured");
    }

    const { username, email }: SignupNotificationRequest = await req.json();

    // Validate required fields
    if (!username) {
      throw new Error("Username is required");
    }

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
      subject: `🏀 New Account Request: ${username}`,
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
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <img src="https://hoopjournal.me/hoop-journal-logo.png" alt="Hoop Journal" style="height: 60px; width: auto;" />
                    </td>
                  </tr>
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding-bottom: 8px;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">New Account Request! 🏀</h1>
                    </td>
                  </tr>
                  
                  <!-- Subheader -->
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <p style="margin: 0; font-size: 14px; color: #a1a1aa;">A new player wants to join the team</p>
                    </td>
                  </tr>
                  
                  <!-- Card -->
                  <tr>
                    <td style="background-color: #18181b; border-radius: 12px; padding: 24px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        
                        <!-- Username -->
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Username</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #f97316;">@${username}</p>
                          </td>
                        </tr>
                        
                        <!-- Email -->
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${email || "Not provided"}</p>
                          </td>
                        </tr>
                        
                        <!-- Signup Time -->
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Signed Up</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${signupTime} ET</p>
                          </td>
                        </tr>
                        
                        <!-- CTA Button -->
                        <tr>
                          <td align="center">
                            <a href="${adminUrl}" 
                               style="display: inline-block; padding: 14px 32px; background-color: #f97316; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                              Review Account Request
                            </a>
                          </td>
                        </tr>
                        
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 32px;">
                      <p style="margin: 0; font-size: 12px; color: #52525b;">
                        Hoop Journal Admin Notification
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

    console.log("Admin notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-signup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
