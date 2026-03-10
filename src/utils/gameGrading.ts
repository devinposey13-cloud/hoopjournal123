import type { GameStats } from '@/types/basketball';
import { calculatePerformance } from '@/utils/performanceScoring';

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+';

/**
 * Calculate Game Score using the weighted formula:
 * Points + Rebounds + (1.5 × Assists) + (2 × Steals) + (2 × Blocks) - (1.5 × Turnovers)
 */
export function calculateGameScore(game: Pick<GameStats, 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers'>): number {
  const raw =
    game.points +
    game.rebounds +
    1.5 * game.assists +
    2 * game.steals +
    2 * game.blocks -
    1.5 * game.turnovers;
  return Math.round(raw * 10) / 10;
}

export function getLetterGradeFromScore(score: number): LetterGrade {
  if (score >= 30) return 'A+';
  if (score >= 24) return 'A';
  if (score >= 19) return 'A-';
  if (score >= 15) return 'B+';
  if (score >= 12) return 'B';
  if (score >= 9) return 'B-';
  return 'C+';
}

export function getGradeColor(grade: LetterGrade): string {
  switch (grade) {
    case 'A+': return '#FFD700'; // gold
    case 'A':  return '#FF6B00'; // orange
    case 'A-': return '#FFA94D'; // light orange
    case 'B+': return '#FFB870'; // soft orange
    case 'B':  return '#94A3B8'; // neutral gray
    case 'B-': return '#CBD5E1'; // light gray
    case 'C+': return '#9CA3AF'; // muted gray
  }
}

export function getGradeGlow(grade: LetterGrade): string {
  if (grade === 'A+') return '0 0 60px rgba(255, 215, 0, 0.5)';
  if (grade === 'A') return '0 0 60px rgba(255, 107, 0, 0.5)';
  if (grade === 'A-') return '0 0 50px rgba(255, 169, 77, 0.4)';
  if (grade.startsWith('B')) return '0 0 40px rgba(255, 184, 112, 0.3)';
  return '0 0 30px rgba(148, 163, 184, 0.2)';
}

export interface PerformanceTag {
  label: string;
  emoji: string;
}

export function detectPerformanceTags(game: GameStats): PerformanceTag[] {
  const tags: PerformanceTag[] = [];
  const doubleDigitStats = [
    game.points, game.rebounds, game.assists, game.steals, game.blocks
  ].filter(v => v >= 10).length;

  if (doubleDigitStats >= 3) {
    tags.push({ label: 'Triple Double', emoji: '👑' });
  } else if (doubleDigitStats >= 2) {
    tags.push({ label: 'Double Double', emoji: '🔥' });
  }

  if (game.points >= 30) {
    tags.push({ label: 'Scoring Machine', emoji: '💪' });
  }

  const fgPct = game.fgAttempted > 0 ? game.fgMade / game.fgAttempted : 0;
  if (fgPct >= 0.55 && game.fgAttempted >= 8) {
    tags.push({ label: 'Hot Shooting', emoji: '🎯' });
  }

  if (game.assists >= 8) {
    tags.push({ label: 'Playmaker Night', emoji: '🏀' });
  }

  if (game.steals + game.blocks >= 5) {
    tags.push({ label: 'Lockdown D', emoji: '🛡️' });
  }

  return tags.slice(0, 2);
}

export function getGameGradeData(game: GameStats) {
  const gameScore = calculateGameScore(game);
  const grade = getLetterGradeFromScore(gameScore);
  const color = getGradeColor(grade);
  const glow = getGradeGlow(grade);
  const tags = detectPerformanceTags(game);
  // XP stays independent via the performance scoring system
  const perf = calculatePerformance(game);

  return { grade, color, glow, tags, xpEarned: perf.xpEarned, tier: perf.tier, gameScore };
}
