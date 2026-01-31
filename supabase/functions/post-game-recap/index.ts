import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client and verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { gameStats, earnedMilestones, playerName, courtRole, seasonGoals, halftimeScoreUs, halftimeScoreThem, finalScoreUs, finalScoreThem } = await req.json();
    
    // Merge team scores into gameStats for processing
    if (halftimeScoreUs !== undefined) gameStats.halftimeScoreUs = halftimeScoreUs;
    if (halftimeScoreThem !== undefined) gameStats.halftimeScoreThem = halftimeScoreThem;
    if (finalScoreUs !== undefined) gameStats.finalScoreUs = finalScoreUs;
    if (finalScoreThem !== undefined) gameStats.finalScoreThem = finalScoreThem;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch verified profile from database for security
    let verifiedName = playerName || '';
    let verifiedCourtRole = courtRole || '';
    let verifiedSeasonGoals: string[] = seasonGoals || [];
    
    try {
      const { data: profileData } = await supabaseClient
        .from('player_settings')
        .select('name, court_role, season_goals')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        verifiedName = profileData.name || verifiedName;
        verifiedCourtRole = profileData.court_role || verifiedCourtRole;
        verifiedSeasonGoals = profileData.season_goals || verifiedSeasonGoals;
      }
    } catch (e) {
      console.log('Could not fetch profile from database, using client-provided data');
    }

    // Calculate some derived stats
    const fgPct = gameStats.fgAttempted > 0 
      ? Math.round((gameStats.fgMade / gameStats.fgAttempted) * 100) 
      : 0;
    const threePct = gameStats.threePtAttempted > 0 
      ? Math.round((gameStats.threePtMade / gameStats.threePtAttempted) * 100) 
      : 0;
    const ftPct = gameStats.ftAttempted > 0 
      ? Math.round((gameStats.ftMade / gameStats.ftAttempted) * 100) 
      : 0;

    // Build milestone section for the prompt
    let milestoneSection = '';
    if (earnedMilestones && earnedMilestones.length > 0) {
      const milestoneNames = earnedMilestones.map((m: any) => `${m.name} (${m.rarity})`).join(', ');
      milestoneSection = `

MILESTONES UNLOCKED THIS GAME:
${milestoneNames}

IMPORTANT: Make sure to celebrate these achievements specifically! Mention each milestone by name and explain why it's impressive.`;
    }

    // Build personalized context based on court role
    let roleContext = '';
    if (verifiedCourtRole) {
      const roleHighlights: Record<string, string> = {
        'Scorer': 'Focus extra praise on scoring, shooting efficiency, and offensive moves.',
        'Playmaker': 'Highlight assists, good decisions, and how they set up teammates.',
        'Defender': 'Celebrate steals, blocks, and defensive effort even if scoring was low.',
        'Energy Player': 'Praise hustle plays, rebounds, and effort that doesn\'t show in stats.',
      };
      roleContext = `\nPLAYER IDENTITY: This player is a "${verifiedCourtRole}". ${roleHighlights[verifiedCourtRole] || ''}`;
    }

    // Build goals context
    let goalsContext = '';
    if (verifiedSeasonGoals && verifiedSeasonGoals.length > 0) {
      goalsContext = `\nSEASON GOALS: ${verifiedSeasonGoals.join(', ')}. If any stats align with these goals, celebrate that progress specifically!`;
    }

    const systemPrompt = `You are Coach AI, an incredibly supportive and encouraging youth basketball coach. Your job is to give a post-game recap that makes young players feel proud of their efforts while gently suggesting ways to improve.

PLAYER: ${verifiedName || 'Player'}${roleContext}${goalsContext}

CRITICAL GUIDELINES:
- Address the player by name (${verifiedName || 'champ'}) to make it personal
- This app is used by KIDS and young players - be extremely positive and encouraging
- ALWAYS start with genuine praise and celebration of what went well
- Use enthusiastic language and emojis where appropriate 🏀⭐🔥
- Frame ALL feedback positively - never criticize, only suggest "ways to get even better"
- Connect feedback to their identity as a ${verifiedCourtRole || 'player'} when relevant
- End with motivation and encouragement to keep working hard
- Keep the tone fun, supportive, and like a friendly coach talking to their player after the game
- If the player unlocked any milestones, celebrate them enthusiastically! These are special achievements.

STRUCTURE YOUR RESPONSE:
1. **Great Job Today, ${verifiedName || 'Champ'}!** - Start with 2-3 specific things the player did well based on their stats
2. **Highlight Reel** - Call out their best stat or achievement from this game
${earnedMilestones && earnedMilestones.length > 0 ? '3. **🏆 Milestones Unlocked!** - Celebrate each milestone they earned with specific praise\n4. **Level Up Tips** - 1-2 friendly suggestions for improvement\n5. **Keep Going!** - End with encouragement and motivation' : '3. **Level Up Tips** - 1-2 friendly suggestions for improvement (frame as exciting opportunities, not weaknesses)\n4. **Keep Going!** - End with encouragement and motivation'}

Keep the response under 300 words but make every word count!`;

    // Build team score section
    let teamScoreSection = '';
    if (gameStats.finalScoreUs !== undefined && gameStats.finalScoreThem !== undefined) {
      teamScoreSection = `\nTEAM SCORE: Final ${gameStats.finalScoreUs} - ${gameStats.finalScoreThem}`;
      if (gameStats.halftimeScoreUs !== undefined && gameStats.halftimeScoreThem !== undefined) {
        teamScoreSection += ` (Halftime: ${gameStats.halftimeScoreUs} - ${gameStats.halftimeScoreThem})`;
      }
    }

    const userMessage = `Here are the game stats for my post-game recap:

GAME RESULT: ${gameStats.isWin ? '🏆 WIN!' : 'Tough game'} vs ${gameStats.opponent}${teamScoreSection}

SCORING:
- Points: ${gameStats.points}
- Field Goals: ${gameStats.fgMade}/${gameStats.fgAttempted} (${fgPct}%)
- 3-Pointers: ${gameStats.threePtMade}/${gameStats.threePtAttempted} (${threePct}%)
- Free Throws: ${gameStats.ftMade}/${gameStats.ftAttempted} (${ftPct}%)

OTHER STATS:
- Rebounds: ${gameStats.rebounds}${gameStats.offensiveRebounds ? ` (${gameStats.offensiveRebounds} offensive, ${gameStats.defensiveRebounds} defensive)` : ''}
- Assists: ${gameStats.assists}
- Steals: ${gameStats.steals}
- Blocks: ${gameStats.blocks}
- Turnovers: ${gameStats.turnovers}${milestoneSection}

Please give me an encouraging post-game recap!`;

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
          { role: "user", content: userMessage },
        ],
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
      return new Response(JSON.stringify({ error: "Failed to generate recap" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Post game recap error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
