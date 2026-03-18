import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentYear = new Date().getFullYear();

    const systemPrompt = `You are a basketball schedule parser. You receive an image of a basketball schedule (screenshot, tournament bracket, team schedule graphic, or table). Extract every game you can find. For dates missing a year, assume ${currentYear} or ${currentYear + 1} depending on the month (school basketball seasons typically run from October to March). If a time is not shown, use "TBD". If location is not shown, leave it empty. If home/away is not indicated, use "unknown".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract all games from this basketball schedule image. Use the extract_games tool to return structured data.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_games",
              description: "Extract structured game data from a basketball schedule image.",
              parameters: {
                type: "object",
                properties: {
                  games: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        opponent: {
                          type: "string",
                          description: "Name of the opposing team",
                        },
                        date: {
                          type: "string",
                          description: "Game date in YYYY-MM-DD format",
                        },
                        time: {
                          type: "string",
                          description: "Game time (e.g. '6:00 PM') or 'TBD' if not shown",
                        },
                        location: {
                          type: "string",
                          description: "Game location/venue or empty if not shown",
                        },
                        event_name: {
                          type: "string",
                          description: "Tournament or event name if applicable, empty otherwise",
                        },
                        home_or_away: {
                          type: "string",
                          enum: ["home", "away", "unknown"],
                          description: "Whether the game is home, away, or unknown",
                        },
                        confidence: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "Confidence in the accuracy of the extracted data. high = all fields clear, medium = some fields unclear, low = opponent or date uncertain",
                        },
                      },
                      required: ["opponent", "date", "time", "home_or_away", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["games"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_games" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse schedule image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ games: [], message: "Could not detect any games in this image." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const games = parsed.games || [];

    return new Response(
      JSON.stringify({ games }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-schedule-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
