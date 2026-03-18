import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const AVATAR_PROMPT = "Create a stylized illustrated portrait of the person in this photo as a basketball player avatar. CRITICAL: You MUST precisely preserve the person's exact facial structure, skin tone, eye shape, nose shape, mouth shape, hairstyle, hair color, and any distinguishing facial features — the result must be immediately recognizable as the same person. Apply a vibrant digital illustration style similar to NBA 2K cover art or trading card illustrations. Use dynamic lighting with rim lighting effects. Add a subtle basketball-themed background with soft bokeh court lights. The style should be polished and professional while keeping the likeness perfectly intact. IMPORTANT: Do NOT add any text, names, nicknames, labels, watermarks, or any written words anywhere in the image. The image must contain zero text of any kind.";

const MODELS = [
  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview",
];

async function tryGenerateAvatar(apiKey: string, imageUrl: string, model: string): Promise<string | null> {
  console.log(`Trying model: ${model}`);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: AVATAR_PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (response.status === 429) {
    throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
  }
  if (response.status === 402) {
    throw { status: 402, message: "AI credits exhausted. Please add credits to continue." };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Model ${model} returned ${response.status}:`, errorText.substring(0, 200));
    return null;
  }

  const data = await response.json();
  const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!generatedImageUrl) {
    console.error(`Model ${model} returned no image. finish_reason:`, data.choices?.[0]?.finish_reason);
    return null;
  }

  console.log(`Avatar generated successfully with ${model}`);
  return generatedImageUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating avatar from image:", imageUrl);

    // Try each model, with one retry on the primary model
    for (let attempt = 0; attempt < 3; attempt++) {
      const modelIndex = attempt === 0 ? 0 : attempt === 1 ? 0 : 1; // retry primary once, then fallback
      const model = MODELS[modelIndex];

      try {
        const result = await tryGenerateAvatar(LOVABLE_API_KEY, imageUrl, model);
        if (result) {
          return new Response(
            JSON.stringify({ success: true, imageData: result }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err: any) {
        if (err?.status === 429 || err?.status === 402) {
          return new Response(
            JSON.stringify({ error: err.message }),
            { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error(`Attempt ${attempt + 1} failed:`, err);
      }

      // Brief pause between retries
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    return new Response(
      JSON.stringify({ error: "Failed to generate avatar after multiple attempts. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate avatar error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
