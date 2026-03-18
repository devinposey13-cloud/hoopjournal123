import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

interface SeasonStats {
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
  ftPercentage?: number;
  threePtPercentage?: number;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    const { stats, position, playerName } = await req.json();
    
    if (!stats) {
      return new Response(
        JSON.stringify({ error: 'Stats are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typedStats = stats as SeasonStats;
    
    console.log(`User ${userId} - Comparing player stats`);

    // Build a detailed comparison query
    const statsDescription = `
Player Stats Profile:
- Points per game: ${typedStats.avgPoints.toFixed(1)}
- Rebounds per game: ${typedStats.avgRebounds.toFixed(1)}
- Assists per game: ${typedStats.avgAssists.toFixed(1)}
- Steals per game: ${typedStats.avgSteals.toFixed(1)}
- Blocks per game: ${typedStats.avgBlocks.toFixed(1)}
- Field Goal %: ${typedStats.fgPercentage.toFixed(1)}%
${typedStats.ftPercentage ? `- Free Throw %: ${typedStats.ftPercentage.toFixed(1)}%` : ''}
${typedStats.threePtPercentage ? `- 3-Point %: ${typedStats.threePtPercentage.toFixed(1)}%` : ''}
${position ? `- Position: ${position}` : ''}
${playerName ? `- Player Name: ${playerName}` : ''}
`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are a basketball analytics expert who specializes in comparing players across different eras and leagues. When given a player's stats, find NBA or WNBA players (current or historical) with similar statistical profiles.

Your analysis should:
1. Identify 2-3 professional players with similar stat lines (consider per-game averages, efficiency, and playing style)
2. Explain why each comparison makes sense (what aspects of their game are similar)
3. Highlight what the player can learn from studying each compared pro
4. Be encouraging while providing actionable insights

Consider players from all eras - legends and current stars. Account for position when making comparisons. Be specific about which aspects of their games align.`
          },
          {
            role: 'user',
            content: `Analyze this player's statistics and find NBA/WNBA players with similar profiles:\n${statsDescription}\n\nProvide detailed player comparisons with insights on what this player can learn from each pro.`
          }
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    
    const comparison = data.choices?.[0]?.message?.content || 'No comparison generated';
    const citations = data.citations || [];

    console.log(`User ${userId} - Comparison successful`);

    return new Response(
      JSON.stringify({ comparison, citations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in perplexity-compare:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
