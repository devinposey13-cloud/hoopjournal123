import type { GameStats } from '@/types/basketball';
import type { PerformanceResult, PerformanceBreakdownItem, PerformanceTier } from '@/types/xp';

// Stat weights for performance calculation
export const STAT_WEIGHTS = {
  points: 1.0,
  assists: 1.5,
  rebounds: 1.2,
  steals: 2.0,
  blocks: 2.0,
  turnovers: -1.5,
  fouls: -0.5,
} as const;

// Efficiency bonus thresholds
export const EFFICIENCY_BONUSES = {
  fgPercentage: { threshold: 0.5, minAttempts: 5, bonus: 0.10 },
  ftPercentage: { threshold: 0.8, minAttempts: 3, bonus: 0.05 },
  zeroTurnovers: { bonus: 0.15 },
  win: { bonus: 0.20 },
} as const;

// Performance tier thresholds and XP ranges
export const PERFORMANCE_TIERS: Record<PerformanceTier, { min: number; max: number; xpMin: number; xpMax: number }> = {
  struggling: { min: 0, max: 15, xpMin: 50, xpMax: 100 },
  developing: { min: 16, max: 30, xpMin: 100, xpMax: 200 },
  solid: { min: 31, max: 50, xpMin: 200, xpMax: 350 },
  great: { min: 51, max: 75, xpMin: 350, xpMax: 500 },
  elite: { min: 76, max: 100, xpMin: 500, xpMax: 700 },
  legendary: { min: 101, max: Infinity, xpMin: 700, xpMax: 1000 },
};

/**
 * Calculate the raw performance score from game stats
 */
export function calculateRawScore(game: GameStats): { score: number; breakdown: PerformanceBreakdownItem[] } {
  const breakdown: PerformanceBreakdownItem[] = [];
  let score = 0;

  // Points
  const pointsContrib = game.points * STAT_WEIGHTS.points;
  breakdown.push({ stat: 'Points', value: game.points, weight: STAT_WEIGHTS.points, contribution: pointsContrib });
  score += pointsContrib;

  // Assists
  const assistsContrib = game.assists * STAT_WEIGHTS.assists;
  breakdown.push({ stat: 'Assists', value: game.assists, weight: STAT_WEIGHTS.assists, contribution: assistsContrib });
  score += assistsContrib;

  // Rebounds
  const reboundsContrib = game.rebounds * STAT_WEIGHTS.rebounds;
  breakdown.push({ stat: 'Rebounds', value: game.rebounds, weight: STAT_WEIGHTS.rebounds, contribution: reboundsContrib });
  score += reboundsContrib;

  // Steals
  const stealsContrib = game.steals * STAT_WEIGHTS.steals;
  breakdown.push({ stat: 'Steals', value: game.steals, weight: STAT_WEIGHTS.steals, contribution: stealsContrib });
  score += stealsContrib;

  // Blocks
  const blocksContrib = game.blocks * STAT_WEIGHTS.blocks;
  breakdown.push({ stat: 'Blocks', value: game.blocks, weight: STAT_WEIGHTS.blocks, contribution: blocksContrib });
  score += blocksContrib;

  // Turnovers (negative)
  const turnoversContrib = game.turnovers * STAT_WEIGHTS.turnovers;
  breakdown.push({ stat: 'Turnovers', value: game.turnovers, weight: STAT_WEIGHTS.turnovers, contribution: turnoversContrib });
  score += turnoversContrib;

  // Fouls (negative)
  const foulsContrib = game.fouls * STAT_WEIGHTS.fouls;
  breakdown.push({ stat: 'Fouls', value: game.fouls, weight: STAT_WEIGHTS.fouls, contribution: foulsContrib });
  score += foulsContrib;

  return { score: Math.max(0, score), breakdown };
}

/**
 * Calculate efficiency multiplier from bonuses
 */
export function calculateMultiplier(game: GameStats): { multiplier: number; bonuses: string[] } {
  let multiplier = 1.0;
  const bonuses: string[] = [];

  // FG% bonus
  const fgAttempted = game.fgAttempted || 0;
  const fgMade = game.fgMade || 0;
  if (fgAttempted >= EFFICIENCY_BONUSES.fgPercentage.minAttempts) {
    const fgPct = fgMade / fgAttempted;
    if (fgPct >= EFFICIENCY_BONUSES.fgPercentage.threshold) {
      multiplier += EFFICIENCY_BONUSES.fgPercentage.bonus;
      bonuses.push(`FG% Bonus (+${Math.round(EFFICIENCY_BONUSES.fgPercentage.bonus * 100)}%)`);
    }
  }

  // FT% bonus
  const ftAttempted = game.ftAttempted || 0;
  const ftMade = game.ftMade || 0;
  if (ftAttempted >= EFFICIENCY_BONUSES.ftPercentage.minAttempts) {
    const ftPct = ftMade / ftAttempted;
    if (ftPct >= EFFICIENCY_BONUSES.ftPercentage.threshold) {
      multiplier += EFFICIENCY_BONUSES.ftPercentage.bonus;
      bonuses.push(`FT% Bonus (+${Math.round(EFFICIENCY_BONUSES.ftPercentage.bonus * 100)}%)`);
    }
  }

  // Zero turnovers bonus
  if (game.turnovers === 0) {
    multiplier += EFFICIENCY_BONUSES.zeroTurnovers.bonus;
    bonuses.push(`Zero Turnovers (+${Math.round(EFFICIENCY_BONUSES.zeroTurnovers.bonus * 100)}%)`);
  }

  // Win bonus
  if (game.isWin) {
    multiplier += EFFICIENCY_BONUSES.win.bonus;
    bonuses.push(`Win Bonus (+${Math.round(EFFICIENCY_BONUSES.win.bonus * 100)}%)`);
  }

  return { multiplier, bonuses };
}

/**
 * Determine performance tier from final score
 */
export function getPerformanceTier(score: number): PerformanceTier {
  if (score >= PERFORMANCE_TIERS.legendary.min) return 'legendary';
  if (score >= PERFORMANCE_TIERS.elite.min) return 'elite';
  if (score >= PERFORMANCE_TIERS.great.min) return 'great';
  if (score >= PERFORMANCE_TIERS.solid.min) return 'solid';
  if (score >= PERFORMANCE_TIERS.developing.min) return 'developing';
  return 'struggling';
}

/**
 * Calculate XP earned from performance score
 */
export function calculateXpFromScore(score: number): number {
  const tier = getPerformanceTier(score);
  const tierConfig = PERFORMANCE_TIERS[tier];
  
  // Linear interpolation within the tier
  const tierRange = tierConfig.max === Infinity ? 50 : tierConfig.max - tierConfig.min;
  const scoreInTier = Math.min(score - tierConfig.min, tierRange);
  const tierProgress = scoreInTier / tierRange;
  
  const xpRange = tierConfig.xpMax - tierConfig.xpMin;
  const xp = tierConfig.xpMin + (tierProgress * xpRange);
  
  return Math.round(xp);
}

/**
 * Get display name for performance tier
 */
export function getTierDisplayName(tier: PerformanceTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Get color class for performance tier
 */
export function getTierColorClass(tier: PerformanceTier): string {
  switch (tier) {
    case 'legendary': return 'text-yellow-400';
    case 'elite': return 'text-purple-400';
    case 'great': return 'text-blue-400';
    case 'solid': return 'text-green-400';
    case 'developing': return 'text-orange-400';
    case 'struggling': return 'text-muted-foreground';
  }
}

/**
 * Get gradient class for performance tier
 */
export function getTierGradient(tier: PerformanceTier): string {
  switch (tier) {
    case 'legendary': return 'from-yellow-500 to-orange-500';
    case 'elite': return 'from-purple-500 to-pink-500';
    case 'great': return 'from-blue-500 to-cyan-500';
    case 'solid': return 'from-green-500 to-emerald-500';
    case 'developing': return 'from-orange-500 to-amber-500';
    case 'struggling': return 'from-gray-500 to-slate-500';
  }
}

/**
 * Calculate full performance result from game stats
 */
export function calculatePerformance(game: GameStats): PerformanceResult {
  const { score: rawScore, breakdown } = calculateRawScore(game);
  const { multiplier, bonuses } = calculateMultiplier(game);
  
  const finalScore = rawScore * multiplier;
  const tier = getPerformanceTier(finalScore);
  const xpEarned = calculateXpFromScore(finalScore);
  
  return {
    rawScore,
    multiplier,
    finalScore,
    tier,
    xpEarned,
    breakdown,
    bonuses,
  };
}
