import type { LevelReward, XpGainResult, XpProgress } from '@/types/xp';
import type { GameStats, ScheduledGame } from '@/types/basketball';
import { isStatsMissing, findLinkedLoggedGame } from '@/utils/gameStatus';

// XP curve configuration
export const XP_CONFIG = {
  BASE_XP: 100,
  GROWTH_RATE: 0.08,
  CURVE_FACTOR: 1.5,
  MAX_LEVEL: 50,
  RECOVERY_BONUS_XP: 15,
  /** Hours after game date within which recovery XP is eligible */
  RECOVERY_WINDOW_HOURS: 72,
  /** Streak XP bonus tiers: [gamesRequired, xpBonus] */
  STREAK_BONUSES: [
    [20, 75],
    [10, 40],
    [5, 20],
    [3, 10],
    [1, 5],
  ] as readonly [number, number][],
} as const;

/**
 * Calculate XP required to reach a specific level
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(
    XP_CONFIG.BASE_XP * Math.pow(1 + (level - 1) * XP_CONFIG.GROWTH_RATE, XP_CONFIG.CURVE_FACTOR)
  );
}

/**
 * Calculate total XP required to reach a level from level 1
 */
export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += getXpForLevel(i);
  }
  return total;
}

/**
 * Get level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  let xpAccumulated = 0;
  
  while (level < XP_CONFIG.MAX_LEVEL) {
    const xpForNextLevel = getXpForLevel(level + 1);
    if (xpAccumulated + xpForNextLevel > totalXp) {
      break;
    }
    xpAccumulated += xpForNextLevel;
    level++;
  }
  
  return level;
}

/**
 * Get XP progress within current level
 */
export function getXpProgressInLevel(totalXp: number): { current: number; required: number; percent: number } {
  const currentLevel = getLevelFromXp(totalXp);
  
  if (currentLevel >= XP_CONFIG.MAX_LEVEL) {
    return { current: 0, required: 0, percent: 100 };
  }
  
  const xpForCurrentLevel = getTotalXpForLevel(currentLevel);
  const xpInLevel = totalXp - xpForCurrentLevel;
  const xpForNextLevel = getXpForLevel(currentLevel + 1);
  const percent = (xpInLevel / xpForNextLevel) * 100;
  
  return {
    current: xpInLevel,
    required: xpForNextLevel,
    percent: Math.min(100, percent),
  };
}

/**
 * Calculate the result of gaining XP
 */
export function calculateXpGain(
  currentProgress: XpProgress | null,
  xpGained: number,
  allRewards: LevelReward[],
  unlockedRewardIds: string[],
  recoveryBonus: number = 0
): XpGainResult {
  const previousXp = currentProgress?.current_xp ?? 0;
  const previousLevel = currentProgress?.current_level ?? 1;
  
  const totalXpGained = xpGained + recoveryBonus;
  const newXp = previousXp + totalXpGained;
  const newLevel = Math.min(XP_CONFIG.MAX_LEVEL, getLevelFromXp(newXp));
  
  const didLevelUp = newLevel > previousLevel;
  const levelsGained = newLevel - previousLevel;
  
  const { current: xpProgressInLevel, required: xpToNextLevel } = getXpProgressInLevel(newXp);
  
  // Find newly unlocked rewards
  const newRewards: LevelReward[] = [];
  if (didLevelUp) {
    for (let level = previousLevel + 1; level <= newLevel; level++) {
      const rewardsAtLevel = allRewards.filter(
        r => r.level_required === level && !unlockedRewardIds.includes(r.id)
      );
      newRewards.push(...rewardsAtLevel);
    }
  }
  
  return {
    previousXp,
    newXp,
    xpGained: totalXpGained,
    previousLevel,
    newLevel,
    didLevelUp,
    levelsGained,
    xpToNextLevel,
    xpProgressInLevel,
    newRewards,
    recoveryBonus,
  };
}

/**
 * Check if a game qualifies for Recovery XP bonus.
 * Eligible when: game was scheduled, is stats_missing, and logged within 72hrs of game date.
 */
export function isRecoveryEligible(gameDate: string, scheduledGameId?: string): boolean {
  if (!scheduledGameId) return false;
  const gameTime = new Date(gameDate).getTime();
  const now = Date.now();
  const windowMs = XP_CONFIG.RECOVERY_WINDOW_HOURS * 60 * 60 * 1000;
  return now - gameTime <= windowMs && now > gameTime;
}

/**
 * Get level tier name
 */
export function getLevelTier(level: number): string {
  if (level >= 45) return 'Diamond';
  if (level >= 35) return 'Gold';
  if (level >= 25) return 'Silver';
  if (level >= 10) return 'Bronze';
  return 'Rookie';
}

/**
 * Get level tier color
 */
export function getLevelTierColor(level: number): string {
  if (level >= 45) return 'text-cyan-400';
  if (level >= 35) return 'text-yellow-400';
  if (level >= 25) return 'text-slate-300';
  if (level >= 10) return 'text-orange-400';
  return 'text-muted-foreground';
}

/**
 * Get level tier gradient
 */
export function getLevelTierGradient(level: number): string {
  if (level >= 45) return 'from-cyan-400 via-blue-500 to-purple-500';
  if (level >= 35) return 'from-yellow-400 via-amber-500 to-orange-500';
  if (level >= 25) return 'from-slate-300 via-gray-400 to-slate-500';
  if (level >= 10) return 'from-orange-400 via-amber-600 to-orange-700';
  return 'from-gray-400 to-gray-600';
}

/**
 * Format XP number with commas
 */
export function formatXp(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get estimated games to reach level 50
 */
export function getGamesToMaxLevel(averageXpPerGame: number, currentXp: number): number {
  if (averageXpPerGame <= 0) return Infinity;
  const totalXpNeeded = getTotalXpForLevel(XP_CONFIG.MAX_LEVEL);
  const xpRemaining = Math.max(0, totalXpNeeded - currentXp);
  return Math.ceil(xpRemaining / averageXpPerGame);
}
