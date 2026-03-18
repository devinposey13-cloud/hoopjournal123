import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
import { getCorsHeaders } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, message, userEmail } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const emailResponse = await resend.emails.send({
      from: "Hoop Journal <noreply@hoopjournal.me>",
      to: ["support@hoopjournal.me"],
      subject: `📝 New Feedback: ${category || "General"}`,
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
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">New User Feedback 📝</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #18181b; border-radius: 12px; padding: 24px; margin-top: 24px;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Category</p>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #f97316;">${category || "General"}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">From</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${userEmail || "Unknown"}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Submitted</p>
                            <p style="margin: 0; font-size: 16px; color: #ffffff;">${submittedAt} ET</p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                            <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 32px;">
                      <p style="margin: 0; font-size: 12px; color: #52525b;">Hoop Journal Feedback Notification</p>
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

    console.log("Feedback notification sent:", emailResponse);

    // Fire Slack alert (non-blocking)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await fetch(`${supabaseUrl}/functions/v1/send-slack-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({
          category: 'user_feedback',
          severity: 'info',
          title: `New Feedback: ${category || 'General'}`,
          summary: message.length > 150 ? message.substring(0, 150) + '...' : message,
          details: { Category: category || 'General', From: userEmail || 'Unknown', Submitted: submittedAt + ' ET' },
          cta_url: 'https://hoopjournal.me',
          dedup_key: `feedback_${userEmail}_${Date.now()}`,
        }),
      });
    } catch (slackErr) {
      console.error('Slack alert failed (non-blocking):', slackErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-feedback:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
