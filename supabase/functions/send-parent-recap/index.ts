import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
import { getCorsHeaders } from '../_shared/cors.ts';

interface GameStats {
  opponent: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  isWin: boolean;
  date: string;
}

interface RecapRequest {
  gameStats: GameStats;
  recap: string;
  playerName: string;
  playerTeam: string;
  sendToSelf?: boolean; // If true, send to player's own email instead of parent
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function generateEmailHtml(
  playerName: string,
  playerTeam: string,
  gameStats: GameStats,
  recap: string,
  isSelfEmail: boolean = false
): string {
  const result = gameStats.isWin ? "WIN" : "LOSS";
  const resultColor = gameStats.isWin ? "#22c55e" : "#ef4444";
  const formattedDate = formatDate(gameStats.date);
  
  // Convert markdown-style formatting to HTML
  const formattedRecap = recap
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${playerName}'s Game Recap</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <img src="https://hoopjournal123.lovable.app/hoop-journal-logo.png" alt="Hoop Journal" width="180" style="display: block; margin: 0 auto;">
            </td>
          </tr>
          
          <!-- Player & Game Info -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">
                ${playerName}'s Game Recap
              </h1>
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; text-align: center;">
                ${playerTeam} • ${formattedDate}
              </p>
              
              <!-- Game Result Banner -->
              <div style="background: linear-gradient(135deg, ${resultColor}22 0%, ${resultColor}11 100%); border: 1px solid ${resultColor}44; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="color: ${resultColor}; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  ${result}
                </span>
                <h2 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                  vs ${gameStats.opponent}
                </h2>
              </div>
              
              <!-- Stats Grid -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td width="33%" style="text-align: center; padding: 16px; background-color: #262626; border-radius: 12px 0 0 12px;">
                    <div style="color: #f97316; font-size: 32px; font-weight: 700; line-height: 1;">${gameStats.points}</div>
                    <div style="color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Points</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 16px; background-color: #262626; border-left: 1px solid #3a3a3a; border-right: 1px solid #3a3a3a;">
                    <div style="color: #f97316; font-size: 32px; font-weight: 700; line-height: 1;">${gameStats.rebounds}</div>
                    <div style="color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Rebounds</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 16px; background-color: #262626; border-radius: 0 12px 12px 0;">
                    <div style="color: #f97316; font-size: 32px; font-weight: 700; line-height: 1;">${gameStats.assists}</div>
                    <div style="color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Assists</div>
                  </td>
                </tr>
              </table>
              
              <!-- Additional Stats -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td width="50%" style="text-align: center; padding: 12px;">
                    <span style="color: #a1a1aa; font-size: 14px;">Steals: </span>
                    <span style="color: #ffffff; font-size: 14px; font-weight: 600;">${gameStats.steals}</span>
                  </td>
                  <td width="50%" style="text-align: center; padding: 12px;">
                    <span style="color: #a1a1aa; font-size: 14px;">Blocks: </span>
                    <span style="color: #ffffff; font-size: 14px; font-weight: 600;">${gameStats.blocks}</span>
                  </td>
                </tr>
              </table>
              
              <!-- Coach AI Recap -->
              <div style="background-color: #262626; border-radius: 12px; padding: 24px; border-left: 4px solid #f97316;">
                <h3 style="margin: 0 0 16px; color: #f97316; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                  🏀 Coach AI's Feedback
                </h3>
                <div style="color: #e4e4e7; font-size: 15px; line-height: 1.7;">
                  ${formattedRecap}
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #151515; border-top: 1px solid #2a2a2a;">
              <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; text-align: center; line-height: 1.6;">
                ${isSelfEmail 
                  ? `Great game, ${playerName}! Keep pushing yourself! 🌟`
                  : `Keep supporting ${playerName}'s basketball journey! 🌟`
                }
              </p>
              <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                Sent from <a href="https://hoopjournal123.lovable.app" style="color: #f97316; text-decoration: none;">Hoop Journal</a> — Your Basketball Story
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const { gameStats, recap, playerName, playerTeam, sendToSelf }: RecapRequest = await req.json();

    if (!gameStats || !recap || !playerName || !playerTeam) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipientEmail: string;
    let isSelfEmail = false;

    if (sendToSelf) {
      // Send to the player's own email (from auth)
      recipientEmail = user.email!;
      isSelfEmail = true;
      
      if (!recipientEmail) {
        return new Response(
          JSON.stringify({ error: "No email found for your account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Send to parent email from player_settings
      const { data: settings, error: settingsError } = await supabase
        .from("player_settings")
        .select("parent_email")
        .eq("user_id", userId)
        .single();

      if (settingsError || !settings?.parent_email) {
        return new Response(
          JSON.stringify({ error: "No parent email configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      recipientEmail = settings.parent_email;
    }

    const result = gameStats.isWin ? "WIN" : "LOSS";
    const subject = `${playerName}'s Game Recap - ${result} vs ${gameStats.opponent}`;

    // Generate email HTML
    const htmlContent = generateEmailHtml(playerName, playerTeam, gameStats, recap, isSelfEmail);

    // Send email via Resend using fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hoop Journal <noreply@hoopjournal.me>",
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const emailResult = await emailResponse.json();

    console.log("Recap email sent successfully to:", recipientEmail, emailResult);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-parent-recap function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
