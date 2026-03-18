import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoachMemory {
  memory_type: string;
  memory_key: string;
  memory_value: string;
  confidence: number;
}

// Get persona-specific style for recaps
function getPersonaRecapStyle(persona: string): string {
  const styles: Record<string, string> = {
    'calm_mentor': `TONE: Calm Mentor 🧘
- Speak with patience and steady encouragement
- Use a thoughtful, measured tone throughout
- Frame improvements as "areas we can grow together"
- Be warm but not over-the-top`,

    'tough_coach': `TONE: Tough Coach 💪
- Be more direct about areas that need work
- Don't over-celebrate average performances
- Use phrases like "here's where you need to step up"
- Still be constructive, but honest`,

    'analyst': `TONE: Analyst 📊
- Focus heavily on the numbers and percentages
- Compare to averages and benchmarks
- Be data-driven and precise
- Less emotional, more factual`,

    'motivator': `TONE: Motivator 🔥
- Bring HIGH ENERGY to every section!
- Use lots of exclamation points and hype!
- Focus on positives and growth potential!
- Celebrate effort and progress loudly!`,

    'parent_friendly': `TONE: Parent-Friendly ❤️
- Use warm, supportive language throughout
- Frame everything gently and positively
- Focus on effort, fun, and love of the game
- Perfect for younger players and their families`,
  };

  return styles[persona] || styles['calm_mentor'];
}

// Format memories for recap context
function formatMemoriesForRecap(memories: CoachMemory[]): string {
  if (!memories || memories.length === 0) return '';

  let context = '\n\nPLAYER HISTORY (Reference these to personalize the recap):';
  
  const patterns = memories.filter(m => m.memory_type === 'pattern');
  if (patterns.length > 0) {
    context += '\n- Past patterns: ' + patterns.map(p => p.memory_value).slice(0, 3).join('; ');
  }
  
  const preferences = memories.filter(m => m.memory_type === 'preference');
  if (preferences.length > 0) {
    context += '\n- Known preferences: ' + preferences.map(p => `${p.memory_key}: ${p.memory_value}`).slice(0, 3).join('; ');
  }

  return context;
}

// Sanitize a string for use in AI prompts: strip newlines, control chars, limit length
function sanitizeString(value: unknown, maxLength = 100): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\n\r\t]/g, ' ').replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '').trim().slice(0, maxLength);
}

// Clamp a numeric stat value to a safe range
function clampStat(value: unknown, min = 0, max = 200): number {
  const num = Number(value);
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(max, Math.round(num)));
}

// Validate and sanitize all game stats from client input
function validateGameStats(raw: Record<string, unknown>) {
  return {
    points: clampStat(raw.points, 0, 150),
    fgMade: clampStat(raw.fgMade, 0, 100),
    fgAttempted: clampStat(raw.fgAttempted, 0, 100),
    threePtMade: clampStat(raw.threePtMade, 0, 50),
    threePtAttempted: clampStat(raw.threePtAttempted, 0, 50),
    ftMade: clampStat(raw.ftMade, 0, 50),
    ftAttempted: clampStat(raw.ftAttempted, 0, 50),
    rebounds: clampStat(raw.rebounds, 0, 50),
    offensiveRebounds: raw.offensiveRebounds != null ? clampStat(raw.offensiveRebounds, 0, 30) : undefined,
    defensiveRebounds: raw.defensiveRebounds != null ? clampStat(raw.defensiveRebounds, 0, 30) : undefined,
    assists: clampStat(raw.assists, 0, 50),
    steals: clampStat(raw.steals, 0, 30),
    blocks: clampStat(raw.blocks, 0, 30),
    turnovers: clampStat(raw.turnovers, 0, 30),
    isWin: typeof raw.isWin === 'boolean' ? raw.isWin : false,
    opponent: sanitizeString(raw.opponent, 100) || 'Unknown',
    halftimeScoreUs: raw.halftimeScoreUs != null ? clampStat(raw.halftimeScoreUs, 0, 300) : undefined,
    halftimeScoreThem: raw.halftimeScoreThem != null ? clampStat(raw.halftimeScoreThem, 0, 300) : undefined,
    finalScoreUs: raw.finalScoreUs != null ? clampStat(raw.finalScoreUs, 0, 300) : undefined,
    finalScoreThem: raw.finalScoreThem != null ? clampStat(raw.finalScoreThem, 0, 300) : undefined,
  };
}

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

    const { gameStats: rawGameStats, earnedMilestones, playerName, courtRole, seasonGoals, halftimeScoreUs, halftimeScoreThem, finalScoreUs, finalScoreThem } = await req.json();
    
    // Validate and sanitize all client-supplied game stats
    const rawWithScores = { ...rawGameStats };
    if (halftimeScoreUs !== undefined) rawWithScores.halftimeScoreUs = halftimeScoreUs;
    if (halftimeScoreThem !== undefined) rawWithScores.halftimeScoreThem = halftimeScoreThem;
    if (finalScoreUs !== undefined) rawWithScores.finalScoreUs = finalScoreUs;
    if (finalScoreThem !== undefined) rawWithScores.finalScoreThem = finalScoreThem;
    const gameStats = validateGameStats(rawWithScores);

    // Sanitize milestone names if provided
    const safeMilestones = Array.isArray(earnedMilestones) 
      ? earnedMilestones.slice(0, 20).map((m: unknown) => {
          if (typeof m === 'object' && m !== null) {
            const obj = m as Record<string, unknown>;
            return { name: sanitizeString(obj.name, 80), rarity: sanitizeString(obj.rarity, 30) };
          }
          return { name: 'Unknown', rarity: 'common' };
        })
      : [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch verified profile from database for security
    let verifiedName = playerName || '';
    let verifiedCourtRole = courtRole || '';
    let verifiedSeasonGoals: string[] = seasonGoals || [];
    let verifiedPersona = 'calm_mentor';
    
    try {
      const { data: profileData } = await supabaseClient
        .from('player_settings')
        .select('name, court_role, season_goals, coach_persona')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        verifiedName = profileData.name || verifiedName;
        verifiedCourtRole = profileData.court_role || verifiedCourtRole;
        verifiedSeasonGoals = profileData.season_goals || verifiedSeasonGoals;
        verifiedPersona = profileData.coach_persona || 'calm_mentor';
      }
    } catch (e) {
      console.log('Could not fetch profile from database, using client-provided data');
    }

    // Fetch coach memories for personalization
    let memories: CoachMemory[] = [];
    try {
      const { data: memoryData } = await supabaseClient
        .from('coach_memory')
        .select('memory_type, memory_key, memory_value, confidence')
        .eq('user_id', userId)
        .order('last_updated_at', { ascending: false })
        .limit(10);
      
      if (memoryData) {
        memories = memoryData;
      }
    } catch (e) {
      console.log('Could not fetch coach memories');
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

    // Build milestone section for the prompt (using sanitized milestones)
    let milestoneSection = '';
    if (safeMilestones.length > 0) {
      const milestoneNames = safeMilestones.map((m: { name: string; rarity: string }) => `${m.name} (${m.rarity})`).join(', ');
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

    const personaStyle = getPersonaRecapStyle(verifiedPersona);
    const memoryContext = formatMemoriesForRecap(memories);

    const systemPrompt = `You are Coach AI, an incredibly supportive and encouraging youth basketball coach. Your job is to give a post-game recap that makes young players feel proud of their efforts while gently suggesting ways to improve.

PLAYER: ${verifiedName || 'Player'}${roleContext}${goalsContext}

${personaStyle}
${memoryContext}

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
- Reference any past patterns or preferences you know about to make this feel personal

STRUCTURE YOUR RESPONSE:
1. **Great Job Today, ${verifiedName || 'Champ'}!** - Start with 2-3 specific things the player did well based on their stats
2. **Highlight Reel** - Call out their best stat or achievement from this game
${safeMilestones.length > 0 ? '3. **🏆 Milestones Unlocked!** - Celebrate each milestone they earned with specific praise\n4. **Level Up Tips** - 1-2 friendly suggestions for improvement\n5. **Keep Going!** - End with encouragement and motivation' : '3. **Level Up Tips** - 1-2 friendly suggestions for improvement (frame as exciting opportunities, not weaknesses)\n4. **Keep Going!** - End with encouragement and motivation'}

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
          title: 'Post Game Recap Failure',
          summary: `post-game-recap edge function threw: ${error instanceof Error ? error.message : String(error)}`,
          details: { 'Function': 'post-game-recap' },
          dedup_key: 'backend_failure_post-game-recap',
        }),
      });
    } catch (_) { /* non-blocking */ }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});