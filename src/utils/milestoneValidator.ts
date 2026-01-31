import type { GameStats } from '@/types/basketball';
import type { MilestoneDefinition, PlayerMilestone } from '@/types/milestone';

interface GameWithId extends GameStats {
  id: string;
  seasonId?: string;
}

/**
 * Find milestones that are no longer valid after a game deletion
 * Returns IDs of player_milestones records that should be deleted
 */
export function findInvalidMilestones(
  currentGames: GameWithId[],
  definitions: MilestoneDefinition[],
  earnedMilestones: PlayerMilestone[],
  seasonId?: string
): string[] {
  const invalidIds: string[] = [];
  
  // Sort games by date (newest first) for streak checking
  const sortedGames = [...currentGames].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const earned of earnedMilestones) {
    const def = definitions.find(d => d.id === earned.milestoneId);
    if (!def) continue;
    
    // Single-game milestones are deleted via cascade when game is deleted
    // So we only need to validate multi-game and season milestones
    if (def.category === 'single_game') continue;
    
    // Check multi-game milestones
    if (def.category === 'multi_game') {
      const stillValid = checkMultiGameMilestoneValidity(sortedGames, def);
      if (!stillValid) {
        invalidIds.push(earned.id);
      }
    }
    
    // Check season milestones
    if (def.category === 'season') {
      const seasonGames = seasonId 
        ? currentGames.filter(g => g.seasonId === seasonId)
        : currentGames;
      const stillValid = checkSeasonMilestoneValidity(seasonGames, def);
      if (!stillValid) {
        invalidIds.push(earned.id);
      }
    }
  }
  
  return invalidIds;
}

/**
 * Check if a multi-game milestone is still valid
 */
function checkMultiGameMilestoneValidity(
  sortedGames: GameWithId[],
  def: MilestoneDefinition
): boolean {
  switch (def.checkType) {
    case 'first_game':
      return sortedGames.length >= 1;
      
    case 'games_played':
      return sortedGames.length >= def.threshold;
      
    case 'win_streak':
      return checkWinStreak(sortedGames, def.threshold);
      
    case 'three_streak':
      return checkThreeStreak(sortedGames, def.secondaryThreshold || 3);
      
    case 'fg_pct_streak':
      return checkFgPctStreak(sortedGames, def.threshold, def.secondaryThreshold || 2);

    case 'rebound_streak':
      return checkStatStreak(sortedGames, 'rebounds', def.threshold, def.secondaryThreshold || 3);

    case 'steal_streak':
      return checkStatStreak(sortedGames, 'steals', def.threshold, def.secondaryThreshold || 5);

    case 'double_double_streak':
      return checkDoubleDoubleStreak(sortedGames, def.secondaryThreshold || 3);

    case 'consistency_streak':
      return checkConsistencyStreak(sortedGames, def.secondaryThreshold || 5);

    case 'minutes_streak':
      return checkStatStreak(sortedGames, 'minutesPlayed', def.threshold, def.secondaryThreshold || 10);
      
    default:
      // Unknown check type - assume still valid
      return true;
  }
}

/**
 * Check if a season milestone is still valid based on current totals
 */
function checkSeasonMilestoneValidity(
  seasonGames: GameWithId[],
  def: MilestoneDefinition
): boolean {
  const totals = calculateSeasonTotals(seasonGames);
  
  switch (def.checkType) {
    case 'season_points':
      return totals.points >= def.threshold;
    case 'season_rebounds':
      return totals.rebounds >= def.threshold;
    case 'season_assists':
      return totals.assists >= def.threshold;
    case 'season_steals':
      return totals.steals >= def.threshold;
    case 'season_blocks':
      return totals.blocks >= def.threshold;
    case 'season_threes':
      return totals.threes >= def.threshold;
    default:
      return true;
  }
}

// Helper functions

function checkWinStreak(games: GameWithId[], required: number): boolean {
  if (games.length < required) return false;
  
  // Check if ANY consecutive streak of 'required' wins exists
  let currentStreak = 0;
  for (const game of games) {
    if (game.isWin) {
      currentStreak++;
      if (currentStreak >= required) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
}

function checkThreeStreak(games: GameWithId[], required: number): boolean {
  if (games.length < required) return false;
  
  let currentStreak = 0;
  for (const game of games) {
    if (game.threePtMade >= 1) {
      currentStreak++;
      if (currentStreak >= required) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
}

function checkFgPctStreak(games: GameWithId[], pctRequired: number, gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  
  let currentStreak = 0;
  for (const game of games) {
    const fgPct = game.fgAttempted > 0 
      ? (game.fgMade / game.fgAttempted) * 100 
      : 0;
    if (fgPct >= pctRequired) {
      currentStreak++;
      if (currentStreak >= gamesRequired) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
}

function checkStatStreak(games: GameWithId[], stat: keyof GameWithId, threshold: number, gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  
  let currentStreak = 0;
  for (const game of games) {
    const value = game[stat];
    if (typeof value === 'number' && value >= threshold) {
      currentStreak++;
      if (currentStreak >= gamesRequired) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
}

function checkDoubleDoubleStreak(games: GameWithId[], gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  
  let currentStreak = 0;
  for (const game of games) {
    let ddCount = 0;
    if (game.points >= 10) ddCount++;
    if (game.rebounds >= 10) ddCount++;
    if (game.assists >= 10) ddCount++;
    if (game.steals >= 10) ddCount++;
    if (game.blocks >= 10) ddCount++;
    
    if (ddCount >= 2) {
      currentStreak++;
      if (currentStreak >= gamesRequired) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
}

function checkConsistencyStreak(games: GameWithId[], gamesRequired: number): boolean {
  if (games.length < gamesRequired) return false;
  
  let currentStreak = 0;
  for (const game of games) {
    if (game.points >= 10 && game.rebounds >= 5 && game.assists >= 3) {
      currentStreak++;
      if (currentStreak >= gamesRequired) return true;
    } else {
      currentStreak = 0;
    }
  }
  return false;
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
