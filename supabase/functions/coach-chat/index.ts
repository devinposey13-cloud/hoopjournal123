import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, playerStats, seasonStats, videoFrames } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Coach AI, an experienced basketball coach with decades of experience developing players at all levels. You're encouraging but honest, providing specific actionable advice.

PLAYER CONTEXT:
${playerStats ? `Recent Game Stats:
- Points: ${playerStats.points}
- Rebounds: ${playerStats.rebounds}
- Assists: ${playerStats.assists}
- Steals: ${playerStats.steals}
- Blocks: ${playerStats.blocks}
- Turnovers: ${playerStats.turnovers}
- Minutes: ${playerStats.minutesPlayed}
- FG: ${playerStats.fgMade}/${playerStats.fgAttempted} (${playerStats.fgAttempted > 0 ? Math.round((playerStats.fgMade / playerStats.fgAttempted) * 100) : 0}%)
- 3PT: ${playerStats.threePtMade}/${playerStats.threePtAttempted}
- FT: ${playerStats.ftMade}/${playerStats.ftAttempted}
- Result: ${playerStats.isWin ? 'Win' : 'Loss'} vs ${playerStats.opponent}` : 'No recent game data available.'}

${seasonStats ? `Season Averages:
- PPG: ${seasonStats.avgPoints}
- RPG: ${seasonStats.avgRebounds}
- APG: ${seasonStats.avgAssists}
- SPG: ${seasonStats.avgSteals}
- BPG: ${seasonStats.avgBlocks}
- FG%: ${seasonStats.fgPercentage}%
- Games: ${seasonStats.gamesPlayed} (${seasonStats.wins}W-${seasonStats.losses}L)` : ''}

COACHING STYLE:
- Start responses with encouragement when appropriate
- Reference specific stats when giving feedback
- Provide 2-3 actionable drills or tips
- Use basketball terminology naturally
- Keep responses concise but helpful (under 200 words unless asked for more detail)
- If asked about something unrelated to basketball, gently redirect to basketball topics

VIDEO ANALYSIS (when frames are provided):
- Analyze the player's form, positioning, and technique
- Look for shooting mechanics, defensive stance, footwork, ball handling
- Identify specific areas for improvement with actionable corrections
- Be encouraging while providing constructive feedback
- Reference what you see in the frames specifically`;

    // Build the messages array for the API call
    const apiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Process messages, handling video frames for the latest user message
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // If this is the last user message and we have video frames, include them
      if (i === messages.length - 1 && msg.role === 'user' && videoFrames && videoFrames.length > 0) {
        // Build multimodal content with images
        const content: any[] = [
          { type: "text", text: msg.content || "Please analyze this basketball video clip and provide feedback on my technique, form, and areas for improvement." }
        ];
        
        // Add video frames as images (limit to 5 frames for efficiency)
        const framesToAnalyze = videoFrames.slice(0, 5);
        for (const frame of framesToAnalyze) {
          content.push({
            type: "image_url",
            image_url: {
              url: frame, // base64 data URL
            }
          });
        }
        
        apiMessages.push({ role: "user", content });
      } else {
        apiMessages.push(msg);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Using model with vision capabilities
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get coach response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Coach chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
