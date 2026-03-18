import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

interface Memory {
  memory_type: string;
  memory_key: string;
  memory_value: string;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { userMessage, assistantResponse } = await req.json();

    if (!userMessage || !assistantResponse) {
      throw new Error("Missing required fields");
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("Missing LOVABLE_API_KEY");
    }

    // Use AI to extract memories from the conversation
    const extractionPrompt = `Analyze this basketball coaching conversation and extract key insights about the player. Return ONLY a JSON array of memories to store.

USER MESSAGE: "${userMessage}"

COACH RESPONSE: "${assistantResponse}"

Extract insights in these categories:
1. "habit" - Recurring behaviors or tendencies (e.g., "practices_shooting_daily", "watches_nba_games")
2. "preference" - What they like or prefer (e.g., "prefers_tough_feedback", "likes_detailed_analysis")
3. "pattern" - Performance patterns (e.g., "struggles_with_free_throws", "strong_in_fourth_quarter")
4. "concern" - Areas of worry or focus (e.g., "worried_about_defense", "wants_to_improve_passing")
5. "strength" - Identified strengths (e.g., "good_court_vision", "reliable_shooter")
6. "goal" - Short-term goals mentioned (e.g., "wants_20_points_game", "aiming_for_varsity")

Rules:
- Only extract CLEAR, SPECIFIC insights from this conversation
- Use snake_case for memory_key
- memory_value should be a brief description
- confidence: 0.3 for vague hints, 0.5 for clear mentions, 0.7 for emphasized topics
- Return empty array [] if no meaningful insights
- Maximum 3 insights per conversation
- Don't repeat obvious things from the stats

Return ONLY valid JSON array like:
[{"memory_type": "preference", "memory_key": "prefers_analytical_feedback", "memory_value": "Responds well to detailed statistical breakdowns", "confidence": 0.5}]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: extractionPrompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to extract memories");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON response
    let memories: Memory[] = [];
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        memories = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse memories:", content);
      memories = [];
    }

    // Validate and clean memories
    const validMemories = memories.filter(
      (m) =>
        m.memory_type &&
        m.memory_key &&
        m.memory_value &&
        typeof m.confidence === "number" &&
        ["habit", "preference", "pattern", "concern", "strength", "goal"].includes(
          m.memory_type
        )
    );

    // Store memories in the database
    for (const memory of validMemories) {
      // Check if memory already exists
      const { data: existing } = await supabaseClient
        .from("coach_memory")
        .select("id, occurrence_count, confidence")
        .eq("user_id", user.id)
        .eq("memory_type", memory.memory_type)
        .eq("memory_key", memory.memory_key)
        .maybeSingle();

      if (existing) {
        // Update existing memory with increased confidence
        await supabaseClient
          .from("coach_memory")
          .update({
            memory_value: memory.memory_value,
            confidence: Math.min(1, (existing.confidence || 0.5) + 0.1),
            occurrence_count: (existing.occurrence_count || 1) + 1,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new memory
        await supabaseClient.from("coach_memory").insert({
          user_id: user.id,
          memory_type: memory.memory_type,
          memory_key: memory.memory_key,
          memory_value: memory.memory_value,
          confidence: memory.confidence,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        memoriesExtracted: validMemories.length,
        memories: validMemories,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-coach-memory:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
