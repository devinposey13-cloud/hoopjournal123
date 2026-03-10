import type { GameStats } from '@/types/basketball';
import type { PerformanceTier } from '@/types/xp';
import { calculatePerformance } from '@/utils/performanceScoring';

export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C' | 'D' | 'F';

const TIER_TO_GRADE: Record<PerformanceTier, LetterGrade> = {
  legendary: 'A+',
  elite: 'A',
  great: 'A-',
  solid: 'B+',
  rising: 'B',
  starter: 'C',
};

export function getLetterGrade(tier: PerformanceTier): LetterGrade {
  return TIER_TO_GRADE[tier];
}

export function getGradeColor(grade: LetterGrade): string {
  if (grade.startsWith('A')) return '#FFD700'; // gold
  if (grade.startsWith('B')) return '#FF6B00'; // orange
  if (grade === 'C') return '#94A3B8'; // gray
  return '#EF4444'; // red
}

export function getGradeGlow(grade: LetterGrade): string {
  if (grade.startsWith('A')) return '0 0 60px rgba(255, 215, 0, 0.5)';
  if (grade.startsWith('B')) return '0 0 60px rgba(255, 107, 0, 0.4)';
  return '0 0 40px rgba(148, 163, 184, 0.3)';
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

  return tags.slice(0, 2); // max 2 tags
}

export function getGameGradeData(game: GameStats) {
  const perf = calculatePerformance(game);
  const grade = getLetterGrade(perf.tier);
  const color = getGradeColor(grade);
  const glow = getGradeGlow(grade);
  const tags = detectPerformanceTags(game);

  return { grade, color, glow, tags, xpEarned: perf.xpEarned, tier: perf.tier };
}
