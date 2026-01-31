import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GameStats {
  id: string;
  user_id: string;
  opponent: string;
  date: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  three_pt_made: number;
  three_pt_attempted: number;
  fg_made: number;
  fg_attempted: number;
  ft_made: number;
  ft_attempted: number;
  turnovers: number;
  is_win: boolean;
  season_id: string | null;
}

interface MilestoneDefinition {
  id: string;
  name: string;
  category: string;
  check_type: string;
  threshold: number;
  secondary_threshold: number | null;
  is_repeatable: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all games
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("*")
      .order("date", { ascending: true });

    if (gamesError) throw gamesError;

    // Get all milestone definitions
    const { data: definitions, error: defsError } = await supabase
      .from("milestone_definitions")
      .select("*");

    if (defsError) throw defsError;

    // Get existing milestones
    const { data: existingMilestones, error: existingError } = await supabase
      .from("player_milestones")
      .select("*");

    if (existingError) throw existingError;

    const existingSet = new Set(
      (existingMilestones || []).map(
        (m: any) => `${m.user_id}-${m.milestone_id}-${m.game_id || "nogame"}`
      )
    );

    const milestonesToInsert: any[] = [];

    // Group games by user
    const gamesByUser = (games || []).reduce((acc: Record<string, GameStats[]>, game: GameStats) => {
      if (!acc[game.user_id]) acc[game.user_id] = [];
      acc[game.user_id].push(game);
      return acc;
    }, {});

    for (const [userId, userGames] of Object.entries(gamesByUser)) {
      const sortedGames = (userGames as GameStats[]).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (let i = 0; i < sortedGames.length; i++) {
        const game = sortedGames[i];
        const gamesUpToNow = sortedGames.slice(0, i + 1);
        const recentGames = sortedGames.slice(0, i + 1).reverse();

        for (const def of definitions as MilestoneDefinition[]) {
          const key = `${userId}-${def.id}-${game.id}`;
          const keyNoGame = `${userId}-${def.id}-nogame`;

          // Check single-game milestones
          if (def.category === "single_game") {
            if (existingSet.has(key)) continue;

            if (checkSingleGameMilestone(def, game)) {
              milestonesToInsert.push({
                user_id: userId,
                milestone_id: def.id,
                season_id: game.season_id,
                game_id: game.id,
                stats_snapshot: createGameSnapshot(game),
                is_viewed: false,
              });
              existingSet.add(key);
            }
          }

          // Check multi-game milestones (only on the game that completes them)
          if (def.category === "multi_game") {
            if (existingSet.has(keyNoGame) && !def.is_repeatable) continue;

            if (checkMultiGameMilestone(def, recentGames, gamesUpToNow.length)) {
              // Check if this is the game that completed the milestone
              const prevGames = sortedGames.slice(0, i).reverse();
              const wasAlreadyEarned = i > 0 && checkMultiGameMilestone(def, prevGames, i);
              
              if (!wasAlreadyEarned) {
                milestonesToInsert.push({
                  user_id: userId,
                  milestone_id: def.id,
                  season_id: game.season_id,
                  game_id: game.id,
                  stats_snapshot: { gamesPlayed: gamesUpToNow.length },
                  is_viewed: false,
                });
                existingSet.add(keyNoGame);
              }
            }
          }

          // Check season milestones
          if (def.category === "season" && game.season_id) {
            const seasonKey = `${userId}-${def.id}-season-${game.season_id}`;
            if (existingSet.has(seasonKey)) continue;

            const seasonGames = gamesUpToNow.filter((g) => g.season_id === game.season_id);
            if (checkSeasonMilestone(def, seasonGames)) {
              const prevSeasonGames = seasonGames.slice(0, -1);
              const wasAlreadyEarned = prevSeasonGames.length > 0 && checkSeasonMilestone(def, prevSeasonGames);
              
              if (!wasAlreadyEarned) {
                const totals = calculateSeasonTotals(seasonGames);
                milestonesToInsert.push({
                  user_id: userId,
                  milestone_id: def.id,
                  season_id: game.season_id,
                  game_id: game.id,
                  stats_snapshot: totals,
                  is_viewed: false,
                });
                existingSet.add(seasonKey);
              }
            }
          }
        }
      }
    }

    // Insert new milestones
    if (milestonesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("player_milestones")
        .insert(milestonesToInsert);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        milestonesAwarded: milestonesToInsert.length,
        details: milestonesToInsert.map((m) => ({
          milestone_id: m.milestone_id,
          game_id: m.game_id,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function checkSingleGameMilestone(def: MilestoneDefinition, game: GameStats): boolean {
  const fgPct = game.fg_attempted > 0 ? (game.fg_made / game.fg_attempted) * 100 : 0;
  const ftPct = game.ft_attempted > 0 ? (game.ft_made / game.ft_attempted) * 100 : 0;
  const doubleDigitCount = countDoubleDigitStats(game);

  switch (def.check_type) {
    case "points_gte":
      return game.points >= def.threshold;
    case "rebounds_gte":
      return game.rebounds >= def.threshold;
    case "assists_gte":
      return game.assists >= def.threshold;
    case "steals_gte":
      return game.steals >= def.threshold;
    case "blocks_gte":
      return game.blocks >= def.threshold;
    case "three_pt_made_gte":
      return game.three_pt_made >= def.threshold;
    case "double_double":
      return doubleDigitCount >= 2;
    case "triple_double":
      return doubleDigitCount >= 3;
    case "perfect_ft":
      return game.ft_made >= def.threshold && ftPct === 100;
    case "efficient_scorer":
      return fgPct >= def.threshold && game.points >= 10;
    case "zero_turnovers":
      return game.turnovers === 0;
    case "perfect_fg":
      return fgPct === 100 && game.fg_made >= def.threshold;
    default:
      return false;
  }
}

function checkMultiGameMilestone(
  def: MilestoneDefinition,
  recentGames: GameStats[],
  totalGames: number
): boolean {
  switch (def.check_type) {
    case "first_game":
      return totalGames >= 1;
    case "games_played":
      return totalGames >= def.threshold;
    case "win_streak":
      return checkStreak(recentGames, def.threshold, (g) => g.is_win);
    case "three_streak":
      return checkStreak(recentGames, def.secondary_threshold || 3, (g) => g.three_pt_made >= 1);
    case "scoring_streak":
      return checkStreak(recentGames, def.secondary_threshold || 3, (g) => g.points >= def.threshold);
    case "assist_streak":
      return checkStreak(recentGames, def.secondary_threshold || 3, (g) => g.assists >= def.threshold);
    case "fg_pct_streak":
      return checkStreak(recentGames, def.secondary_threshold || 2, (g) => {
        const pct = g.fg_attempted > 0 ? (g.fg_made / g.fg_attempted) * 100 : 0;
        return pct >= def.threshold;
      });
    default:
      return false;
  }
}

function checkStreak(games: GameStats[], required: number, condition: (g: GameStats) => boolean): boolean {
  if (games.length < required) return false;
  for (let i = 0; i < required; i++) {
    if (!condition(games[i])) return false;
  }
  return true;
}

function checkSeasonMilestone(def: MilestoneDefinition, seasonGames: GameStats[]): boolean {
  const totals = calculateSeasonTotals(seasonGames);

  switch (def.check_type) {
    case "season_points":
      return totals.seasonPoints >= def.threshold;
    case "season_rebounds":
      return totals.seasonRebounds >= def.threshold;
    case "season_assists":
      return totals.seasonAssists >= def.threshold;
    case "season_steals":
      return totals.seasonSteals >= def.threshold;
    case "season_blocks":
      return totals.seasonBlocks >= def.threshold;
    case "season_threes":
      return totals.seasonThrees >= def.threshold;
    default:
      return false;
  }
}

function calculateSeasonTotals(games: GameStats[]) {
  return games.reduce(
    (acc, g) => ({
      seasonPoints: acc.seasonPoints + g.points,
      seasonRebounds: acc.seasonRebounds + g.rebounds,
      seasonAssists: acc.seasonAssists + g.assists,
      seasonSteals: acc.seasonSteals + g.steals,
      seasonBlocks: acc.seasonBlocks + g.blocks,
      seasonThrees: acc.seasonThrees + g.three_pt_made,
      gamesPlayed: acc.gamesPlayed + 1,
    }),
    { seasonPoints: 0, seasonRebounds: 0, seasonAssists: 0, seasonSteals: 0, seasonBlocks: 0, seasonThrees: 0, gamesPlayed: 0 }
  );
}

function countDoubleDigitStats(game: GameStats): number {
  let count = 0;
  if (game.points >= 10) count++;
  if (game.rebounds >= 10) count++;
  if (game.assists >= 10) count++;
  if (game.steals >= 10) count++;
  if (game.blocks >= 10) count++;
  return count;
}

function createGameSnapshot(game: GameStats) {
  return {
    points: game.points,
    rebounds: game.rebounds,
    assists: game.assists,
    steals: game.steals,
    blocks: game.blocks,
    fgMade: game.fg_made,
    fgAttempted: game.fg_attempted,
    threePtMade: game.three_pt_made,
    ftMade: game.ft_made,
    ftAttempted: game.ft_attempted,
    opponent: game.opponent,
  };
}
