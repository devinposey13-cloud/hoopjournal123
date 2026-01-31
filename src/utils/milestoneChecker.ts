import type { GameStats, SeasonStats } from '@/types/basketball';
import type { MilestoneDefinition, MilestoneStatsSnapshot, NewMilestoneResult } from '@/types/milestone';

interface GameWithId extends GameStats {
  id: string;
}

/**
 * Check single-game milestones for a newly logged game
 * @param earnedIdsForGame - IDs of milestones already earned for THIS specific game
 * @param earnedIdsEver - IDs of all milestones ever earned
 */
export function checkSingleGameMilestones(
  game: GameWithId,
  definitions: MilestoneDefinition[],
  earnedIdsForGame: Set<string>,
  earnedIdsEver: Set<string>
): NewMilestoneResult[] {
  const results: NewMilestoneResult[] = [];
  const singleGameDefs = definitions.filter(d => d.category === 'single_game');

  for (const def of singleGameDefs) {
    // Skip if already earned for this game
    if (earnedIdsForGame.has(def.id)) {
      continue;
    }
    
    // For non-repeatable milestones, skip if ever earned
    if (!def.isRepeatable && earnedIdsEver.has(def.id)) {
      continue;
    }

    if (checkMilestoneCondition(def, game)) {
      results.push({
        milestone: def,
        statsSnapshot: createGameSnapshot(game),
        gameId: game.id,
      });
    }
  }

  return results;
}

/**
 * Check multi-game milestones (streaks, cumulative)
 */
export function checkMultiGameMilestones(
  games: GameWithId[],
  definitions: MilestoneDefinition[],
  earnedMilestoneIds: Set<string>
): NewMilestoneResult[] {
  const results: NewMilestoneResult[] = [];
  const multiGameDefs = definitions.filter(d => d.category === 'multi_game');

  // Sort games by date (newest first)
  const sortedGames = [...games].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const def of multiGameDefs) {
    if (earnedMilestoneIds.has(def.id)) continue;

    switch (def.checkType) {
      case 'first_game':
        if (games.length >= 1) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'games_played':
        if (games.length >= def.threshold) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
          });
        }
        break;

      case 'win_streak':
        if (checkWinStreak(sortedGames, def.threshold)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'three_streak':
        if (checkThreeStreak(sortedGames, def.secondaryThreshold || 3)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'fg_pct_streak':
        if (checkFgPctStreak(sortedGames, def.threshold, def.secondaryThreshold || 2)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'rebound_streak':
        // threshold+ rebounds in secondaryThreshold consecutive games
        if (checkStatStreak(sortedGames, 'rebounds', def.threshold, def.secondaryThreshold || 3)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'steal_streak':
        // threshold+ steals in secondaryThreshold consecutive games
        if (checkStatStreak(sortedGames, 'steals', def.threshold, def.secondaryThreshold || 5)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'double_double_streak':
        // Double-double in secondaryThreshold consecutive games
        if (checkDoubleDoubleStreak(sortedGames, def.secondaryThreshold || 3)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'consistency_streak':
        // 10+ pts, 5+ reb, 3+ ast in secondaryThreshold consecutive games
        if (checkConsistencyStreak(sortedGames, def.secondaryThreshold || 5)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;

      case 'minutes_streak':
        // threshold+ minutes in secondaryThreshold consecutive games
        if (checkStatStreak(sortedGames, 'minutesPlayed', def.threshold, def.secondaryThreshold || 10)) {
          results.push({
            milestone: def,
            statsSnapshot: { gamesPlayed: games.length },
            gameId: sortedGames[0]?.id,
          });
        }
        break;
    }
  }

  return results;
}

/**
 * Check season cumulative milestones
 */
export function checkSeasonMilestones(
  seasonStats: SeasonStats,
  games: GameWithId[],
  definitions: MilestoneDefinition[],
  earnedMilestoneIds: Set<string>
): NewMilestoneResult[] {
  const results: NewMilestoneResult[] = [];
  const seasonDefs = definitions.filter(d => d.category === 'season');

  // Calculate season totals
  const totals = calculateSeasonTotals(games);

  for (const def of seasonDefs) {
    if (earnedMilestoneIds.has(def.id)) continue;

    let earned = false;
    switch (def.checkType) {
      case 'season_points':
        earned = totals.points >= def.threshold;
        break;
      case 'season_rebounds':
        earned = totals.rebounds >= def.threshold;
        break;
      case 'season_assists':
        earned = totals.assists >= def.threshold;
        break;
      case 'season_steals':
        earned = totals.steals >= def.threshold;
        break;
      case 'season_blocks':
        earned = totals.blocks >= def.threshold;
        break;
      case 'season_threes':
        earned = totals.threes >= def.threshold;
        break;
    }

    if (earned) {
      results.push({
        milestone: def,
        statsSnapshot: {
          seasonPoints: totals.points,
          seasonRebounds: totals.rebounds,
          seasonAssists: totals.assists,
          seasonSteals: totals.steals,
          seasonBlocks: totals.blocks,
          seasonThrees: totals.threes,
          gamesPlayed: games.length,
        },
      });
    }
  }

  return results;
}

// Helper functions

function checkMilestoneCondition(def: MilestoneDefinition, game: GameStats): boolean {
  const fgPct = game.fgAttempted > 0 ? (game.fgMade / game.fgAttempted) * 100 : 0;
  const ftPct = game.ftAttempted > 0 ? (game.ftMade / game.ftAttempted) * 100 : 0;
  const doubleDigitCount = countDoubleDigitStats(game);
  const highDoubleCount = countHighStats(game, 15);

  switch (def.checkType) {
    // Basic stat thresholds
    case 'points_gte':
      return game.points >= def.threshold;
    case 'rebounds_gte':
      return game.rebounds >= def.threshold;
    case 'assists_gte':
      return game.assists >= def.threshold;
    case 'steals_gte':
      return game.steals >= def.threshold;
    case 'blocks_gte':
      return game.blocks >= def.threshold;
    case 'three_pt_made_gte':
      return game.threePtMade >= def.threshold;
    
    // Multi-stat achievements
    case 'double_double':
      return doubleDigitCount >= 2;
    case 'triple_double':
      return doubleDigitCount >= 3;
    case 'quadruple_double':
      return doubleDigitCount >= 4;
    case 'high_double_double':
      return highDoubleCount >= 2;
    
    // Efficiency & shooting
    case 'perfect_ft':
      return game.ftMade >= def.threshold && ftPct === 100;
    case 'efficient_scorer':
      return fgPct >= def.threshold && game.points >= 10;
    case 'perfect_fg':
      return fgPct === 100 && game.fgMade >= def.threshold;
    case 'ft_master':
      return game.ftMade >= def.threshold && ftPct >= 90;
    case 'efficient_high_scorer':
      // Score threshold points on secondaryThreshold% shooting
      return game.points >= def.threshold && fgPct >= (def.secondaryThreshold || 60);
    case 'clutch_ft':
      // FT% threshold in a win with secondaryThreshold+ attempts
      return game.isWin && ftPct >= def.threshold && game.ftAttempted >= (def.secondaryThreshold || 4);
    
    // Ball handling & assists
    case 'zero_turnovers':
      return game.turnovers === 0;
    case 'zero_to_minutes':
      // 0 turnovers with threshold+ minutes played
      return game.turnovers === 0 && game.minutesPlayed >= def.threshold;
    case 'ast_zero_to':
      // threshold+ assists with 0 turnovers
      return game.assists >= def.threshold && game.turnovers === 0;
    case 'ast_gt_fga':
      // More assists than field goal attempts
      return game.assists > game.fgAttempted && game.assists >= 1;
    
    // Defensive excellence
    case 'combined_defensive':
      // threshold+ steals AND secondaryThreshold+ blocks
      return game.steals >= def.threshold && game.blocks >= (def.secondaryThreshold || 2);
    case 'steals_in_win':
      // threshold+ steals in a win
      return game.steals >= def.threshold && game.isWin;
    
    // Rare achievements
    case 'five_by_five':
      // 5+ in all 5 major stat categories
      return game.points >= 5 && game.rebounds >= 5 && game.assists >= 5 && game.steals >= 5 && game.blocks >= 5;
    case 'twenty_twenty':
      // 20+ points AND 20+ rebounds
      return game.points >= 20 && game.rebounds >= 20;
    case 'triple_threat':
      // 20+ pts, 5+ reb, 5+ ast
      return game.points >= 20 && game.rebounds >= 5 && game.assists >= 5;
    
    // Complete game milestones
    case 'perfect_game':
      return game.points >= def.threshold && fgPct >= 60 && game.turnovers === 0 && game.isWin;
    case 'defensive_monster':
      return game.steals >= def.threshold && game.blocks >= 3;
    case 'all_around':
      return game.points >= 10 && game.rebounds >= 10 && game.assists >= 5 && game.steals >= 2 && game.blocks >= 2;
    
    default:
      return false;
  }
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

function countHighStats(game: GameStats, threshold: number): number {
  let count = 0;
  if (game.points >= threshold) count++;
  if (game.rebounds >= threshold) count++;
  if (game.assists >= threshold) count++;
  if (game.steals >= threshold) count++;
  if (game.blocks >= threshold) count++;
  return count;
}

function checkWinStreak(games: GameWithId[], required: number): boolean {
  if (games.length < required) return false;
  for (let i = 0; i < required; i++) {
    if (!games[i].isWin) return false;
  }
  return true;
}

function checkThreeStreak(games: GameWithId[], required: number): boolean {
  if (games.length < required) return false;
  for (let i = 0; i < required; i++) {
    if (games[i].threePtMade < 1) return false;
  }
  return true;
}

function checkFgPctStreak(games: GameWithId[], pctRequired: number, gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  for (let i = 0; i < gamesRequired; i++) {
    const fgPct = games[i].fgAttempted > 0 
      ? (games[i].fgMade / games[i].fgAttempted) * 100 
      : 0;
    if (fgPct < pctRequired) return false;
  }
  return true;
}

function checkStatStreak(games: GameWithId[], stat: keyof GameStats, threshold: number, gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  for (let i = 0; i < gamesRequired; i++) {
    const value = games[i][stat];
    if (typeof value !== 'number' || value < threshold) return false;
  }
  return true;
}

function checkDoubleDoubleStreak(games: GameWithId[], gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  for (let i = 0; i < gamesRequired; i++) {
    const g = games[i];
    const ddCount = countDoubleDigitStats(g);
    if (ddCount < 2) return false;
  }
  return true;
}

function checkConsistencyStreak(games: GameWithId[], gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  for (let i = 0; i < gamesRequired; i++) {
    const g = games[i];
    if (g.points < 10 || g.rebounds < 5 || g.assists < 3) return false;
  }
  return true;
}

function calculateSeasonTotals(games: GameWithId[]) {
  return games.reduce((acc, g) => ({
    points: acc.points + g.points,
    rebounds: acc.rebounds + g.rebounds,
    assists: acc.assists + g.assists,
    steals: acc.steals + g.steals,
    blocks: acc.blocks + g.blocks,
    threes: acc.threes + g.threePtMade,
  }), { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, threes: 0 });
}

function createGameSnapshot(game: GameStats): MilestoneStatsSnapshot {
  return {
    points: game.points,
    rebounds: game.rebounds,
    assists: game.assists,
    steals: game.steals,
    blocks: game.blocks,
    fgMade: game.fgMade,
    fgAttempted: game.fgAttempted,
    threePtMade: game.threePtMade,
    ftMade: game.ftMade,
    ftAttempted: game.ftAttempted,
    opponent: game.opponent,
  };
}
