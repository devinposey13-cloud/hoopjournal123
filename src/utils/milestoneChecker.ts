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
    case 'double_double':
      return doubleDigitCount >= 2;
    case 'triple_double':
      return doubleDigitCount >= 3;
    case 'quadruple_double':
      return doubleDigitCount >= 4;
    case 'perfect_ft':
      return game.ftMade >= def.threshold && ftPct === 100;
    case 'efficient_scorer':
      return fgPct >= def.threshold && game.points >= 10;
    case 'zero_turnovers':
      return game.turnovers === 0;
    case 'perfect_fg':
      return fgPct === 100 && game.fgMade >= def.threshold;
    case 'ft_master':
      return game.ftMade >= def.threshold && ftPct >= 90;
    case 'high_double_double':
      return highDoubleCount >= 2;
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
