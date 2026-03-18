import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

const extractionTool = {
  type: "function",
  function: {
    name: "extract_game_stats",
    description: "Extract basketball game statistics from a natural language description of a game performance",
    parameters: {
      type: "object",
      properties: {
        opponent: { 
          type: "string", 
          description: "Name of the opposing team" 
        },
        points: { 
          type: "number", 
          description: "Total points scored by the player" 
        },
        rebounds: { 
          type: "number", 
          description: "Total rebounds" 
        },
        offensiveRebounds: { 
          type: "number", 
          description: "Offensive rebounds" 
        },
        defensiveRebounds: { 
          type: "number", 
          description: "Defensive rebounds" 
        },
        assists: { 
          type: "number", 
          description: "Total assists" 
        },
        steals: { 
          type: "number", 
          description: "Total steals" 
        },
        blocks: { 
          type: "number", 
          description: "Total blocks" 
        },
        turnovers: { 
          type: "number", 
          description: "Total turnovers" 
        },
        fouls: { 
          type: "number", 
          description: "Personal fouls committed" 
        },
        minutesPlayed: { 
          type: "number", 
          description: "Minutes played in the game" 
        },
        fgMade: { 
          type: "number", 
          description: "Field goals made (total, including 2-pointers and 3-pointers)" 
        },
        fgAttempted: { 
          type: "number", 
          description: "Field goals attempted (total)" 
        },
        threePtMade: { 
          type: "number", 
          description: "Three-point shots made" 
        },
        threePtAttempted: { 
          type: "number", 
          description: "Three-point shots attempted" 
        },
        ftMade: { 
          type: "number", 
          description: "Free throws made" 
        },
        ftAttempted: { 
          type: "number", 
          description: "Free throws attempted" 
        },
        isWin: { 
          type: "boolean", 
          description: "Whether the player's team won the game" 
        },
        finalScoreUs: {
          type: "number",
          description: "Final score for the player's team"
        },
        finalScoreThem: {
          type: "number",
          description: "Final score for the opposing team"
        },
        halftimeScoreUs: {
          type: "number",
          description: "Halftime score for the player's team"
        },
        halftimeScoreThem: {
          type: "number",
          description: "Halftime score for the opposing team"
        }
      },
      required: ["opponent"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { description, date } = await req.json();

    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at extracting basketball game statistics from natural language descriptions. 
Extract all mentioned statistics accurately. When parsing shooting stats:
- "7-for-12" or "7/12" means 7 made out of 12 attempted
- "3-for-8 from three" means 3 three-pointers made, 8 attempted
- Calculate total points if not explicitly stated: (2-pt FGs * 2) + (3-pt FGs * 3) + (FTs * 1)
- If total field goals are mentioned without breakdown, assume they include both 2s and 3s
- Default missing stats to 0, but don't guess at stats that weren't mentioned
- For win/loss, look for words like "won", "beat", "lost", "defeated by", or score comparisons
- If a score like "62-55" is mentioned, the first number is usually the player's team if they won`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract game statistics from this description: "${description}"${date ? ` (Game date: ${date})` : ''}` }
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_game_stats" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to extract stats from description");
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_game_stats") {
      throw new Error("No valid extraction result from AI");
    }

    const extractedStats = JSON.parse(toolCall.function.arguments);
    
    // Validate and normalize stats
    const normalizedStats = {
      opponent: extractedStats.opponent || "Unknown",
      points: Math.max(0, Math.min(100, extractedStats.points ?? 0)),
      rebounds: Math.max(0, Math.min(50, extractedStats.rebounds ?? 0)),
      offensiveRebounds: Math.max(0, Math.min(30, extractedStats.offensiveRebounds ?? 0)),
      defensiveRebounds: Math.max(0, Math.min(30, extractedStats.defensiveRebounds ?? 0)),
      assists: Math.max(0, Math.min(30, extractedStats.assists ?? 0)),
      steals: Math.max(0, Math.min(20, extractedStats.steals ?? 0)),
      blocks: Math.max(0, Math.min(20, extractedStats.blocks ?? 0)),
      turnovers: Math.max(0, Math.min(20, extractedStats.turnovers ?? 0)),
      fouls: Math.max(0, Math.min(6, extractedStats.fouls ?? 0)),
      minutesPlayed: Math.max(0, Math.min(48, extractedStats.minutesPlayed ?? 0)),
      fgMade: Math.max(0, Math.min(40, extractedStats.fgMade ?? 0)),
      fgAttempted: Math.max(0, Math.min(50, extractedStats.fgAttempted ?? 0)),
      threePtMade: Math.max(0, Math.min(20, extractedStats.threePtMade ?? 0)),
      threePtAttempted: Math.max(0, Math.min(30, extractedStats.threePtAttempted ?? 0)),
      ftMade: Math.max(0, Math.min(30, extractedStats.ftMade ?? 0)),
      ftAttempted: Math.max(0, Math.min(30, extractedStats.ftAttempted ?? 0)),
      isWin: extractedStats.isWin ?? null,
      finalScoreUs: extractedStats.finalScoreUs ?? null,
      finalScoreThem: extractedStats.finalScoreThem ?? null,
      halftimeScoreUs: extractedStats.halftimeScoreUs ?? null,
      halftimeScoreThem: extractedStats.halftimeScoreThem ?? null,
    };

    // Ensure fgAttempted >= fgMade
    if (normalizedStats.fgAttempted < normalizedStats.fgMade) {
      normalizedStats.fgAttempted = normalizedStats.fgMade;
    }
    if (normalizedStats.threePtAttempted < normalizedStats.threePtMade) {
      normalizedStats.threePtAttempted = normalizedStats.threePtMade;
    }
    if (normalizedStats.ftAttempted < normalizedStats.ftMade) {
      normalizedStats.ftAttempted = normalizedStats.ftMade;
    }

    // Calculate missing fields list
    const missingFields: string[] = [];
    if (!extractedStats.opponent) missingFields.push("opponent");
    if (extractedStats.points === undefined) missingFields.push("points");
    if (extractedStats.rebounds === undefined) missingFields.push("rebounds");
    if (extractedStats.isWin === undefined) missingFields.push("isWin");
    if (extractedStats.minutesPlayed === undefined) missingFields.push("minutesPlayed");

    // Calculate confidence based on how many fields were extracted
    const totalFields = Object.keys(extractionTool.function.parameters.properties).length;
    const extractedFieldCount = Object.entries(extractedStats).filter(([, v]) => v !== undefined && v !== null).length;
    const confidence = Math.round((extractedFieldCount / totalFields) * 100);

    return new Response(
      JSON.stringify({
        ...normalizedStats,
        confidence,
        missingFields
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Extract game stats error:", error);

    // Fire backend_failure Slack alert (non-blocking)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await fetch(`${supabaseUrl}/functions/v1/send-slack-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          category: 'backend_failure',
          severity: 'critical',
          title: 'Extract Game Stats Failure',
          summary: `extract-game-stats edge function threw: ${error instanceof Error ? error.message : String(error)}`,
          details: { 'Function': 'extract-game-stats' },
          dedup_key: 'backend_failure_extract-game-stats',
        }),
      });
    } catch (_) { /* non-blocking */ }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract stats" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
