import type { GameStats } from '@/types/basketball';
import { calculateGameScore } from '@/utils/gameGrading';
import { calculateCareerHighs } from '@/utils/statsCalculations';

export type InsightType =
  | 'career_high'
  | 'efficiency'
  | 'playmaking'
  | 'defensive_impact'
  | 'all_around'
  | 'above_average'
  | 'bounce_back'
  | 'consistency'
  | 'fallback';

export interface PostGameInsight {
  type: InsightType;
  title: string;
  body: string;
  statCallout?: string;
  icon: string;
}

// Priority order (highest first)
const INSIGHT_PRIORITY: InsightType[] = [
  'career_high',
  'efficiency',
  'playmaking',
  'defensive_impact',
  'all_around',
  'above_average',
  'bounce_back',
  'consistency',
];

interface SeasonAverages {
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  avgTurnovers: number;
  avgGameScore: number;
  fgPercentage: number;
}

function computeAverages(games: GameStats[]): SeasonAverages {
  if (games.length === 0) {
    return { avgPoints: 0, avgRebounds: 0, avgAssists: 0, avgSteals: 0, avgBlocks: 0, avgTurnovers: 0, avgGameScore: 0, fgPercentage: 0 };
  }
  const n = games.length;
  const totalFgm = games.reduce((s, g) => s + g.fgMade, 0);
  const totalFga = games.reduce((s, g) => s + g.fgAttempted, 0);
  return {
    avgPoints: games.reduce((s, g) => s + g.points, 0) / n,
    avgRebounds: games.reduce((s, g) => s + g.rebounds, 0) / n,
    avgAssists: games.reduce((s, g) => s + g.assists, 0) / n,
    avgSteals: games.reduce((s, g) => s + g.steals, 0) / n,
    avgBlocks: games.reduce((s, g) => s + g.blocks, 0) / n,
    avgTurnovers: games.reduce((s, g) => s + g.turnovers, 0) / n,
    avgGameScore: games.reduce((s, g) => s + calculateGameScore(g), 0) / n,
    fgPercentage: totalFga > 0 ? (totalFgm / totalFga) * 100 : 0,
  };
}

const INSIGHT_ICONS: Record<InsightType, string> = {
  career_high: '🏆',
  efficiency: '🎯',
  playmaking: '🏀',
  defensive_impact: '🛡️',
  all_around: '⭐',
  above_average: '📈',
  bounce_back: '💪',
  consistency: '🔥',
  fallback: '📋',
};

function tryCareerHigh(game: GameStats, allGames: GameStats[]): PostGameInsight | null {
  if (allGames.length < 2) return null;
  const highs = calculateCareerHighs(allGames);
  const gameHighs = highs.filter(h => h.gameId === game.id);
  if (gameHighs.length === 0) return null;

  const best = gameHighs[0];
  return {
    type: 'career_high',
    title: 'New Personal Best',
    body: `This was your highest ${best.stat.toLowerCase()} total so far.`,
    statCallout: `${best.displayValue} ${best.stat.toUpperCase()}`,
    icon: INSIGHT_ICONS.career_high,
  };
}

function tryEfficiency(game: GameStats, avg: SeasonAverages, gamesCount: number): PostGameInsight | null {
  if (gamesCount < 3) return null;
  const fgPct = game.fgAttempted > 0 ? (game.fgMade / game.fgAttempted) * 100 : 0;
  const gameScore = calculateGameScore(game);

  // Strong FG% with meaningful attempts
  if (fgPct >= 55 && game.fgAttempted >= 6 && fgPct > avg.fgPercentage + 5) {
    return {
      type: 'efficiency',
      title: 'Efficiency Insight',
      body: 'This was one of your most efficient games of the season.',
      statCallout: `${Math.round(fgPct)}% FG`,
      icon: INSIGHT_ICONS.efficiency,
    };
  }

  // Low turnovers with solid assists
  if (game.turnovers <= 1 && game.assists >= 3 && game.turnovers < avg.avgTurnovers) {
    return {
      type: 'efficiency',
      title: 'Ball Security Insight',
      body: 'You protected the ball well and still created offense.',
      statCallout: `${game.assists} AST • ${game.turnovers} TOV`,
      icon: INSIGHT_ICONS.efficiency,
    };
  }

  // Game Score significantly above average
  if (gameScore > avg.avgGameScore * 1.3 && fgPct >= 45 && game.fgAttempted >= 5) {
    return {
      type: 'efficiency',
      title: 'Efficiency Insight',
      body: 'Your Game Score was strong with an efficient stat line.',
      statCallout: `Game Score: ${gameScore.toFixed(1)}`,
      icon: INSIGHT_ICONS.efficiency,
    };
  }

  return null;
}

function tryPlaymaking(game: GameStats, avg: SeasonAverages, gamesCount: number): PostGameInsight | null {
  if (gamesCount < 2) return null;

  if (game.assists >= 8) {
    const atr = game.turnovers > 0 ? (game.assists / game.turnovers).toFixed(1) : `${game.assists}:0`;
    return {
      type: 'playmaking',
      title: 'Playmaker Night',
      body: 'You created strong offense for your team with your passing tonight.',
      statCallout: `${game.assists} AST • ${game.turnovers} TOV`,
      icon: INSIGHT_ICONS.playmaking,
    };
  }

  if (game.assists >= avg.avgAssists + 2 && game.assists >= 4) {
    return {
      type: 'playmaking',
      title: 'Playmaking Insight',
      body: `You had ${Math.round(game.assists - avg.avgAssists)} more assists than your season average.`,
      statCallout: `${game.assists} AST`,
      icon: INSIGHT_ICONS.playmaking,
    };
  }

  return null;
}

function tryDefensiveImpact(game: GameStats, avg: SeasonAverages, gamesCount: number): PostGameInsight | null {
  if (gamesCount < 2) return null;
  const defTotal = game.steals + game.blocks;

  if (defTotal >= 5) {
    return {
      type: 'defensive_impact',
      title: 'Defensive Impact',
      body: 'Your steals and blocks made a big difference in this game.',
      statCallout: `${game.steals} STL • ${game.blocks} BLK`,
      icon: INSIGHT_ICONS.defensive_impact,
    };
  }

  if (game.steals >= avg.avgSteals + 2 || game.blocks >= avg.avgBlocks + 2) {
    return {
      type: 'defensive_impact',
      title: 'Disruptive Defense',
      body: 'You were active defensively and created extra possessions.',
      statCallout: `${game.steals} STL • ${game.blocks} BLK`,
      icon: INSIGHT_ICONS.defensive_impact,
    };
  }

  return null;
}

function tryAllAround(game: GameStats, avg: SeasonAverages, gamesCount: number): PostGameInsight | null {
  if (gamesCount < 2) return null;

  const categories = [
    { val: game.points, avg: avg.avgPoints, threshold: 6 },
    { val: game.rebounds, avg: avg.avgRebounds, threshold: 3 },
    { val: game.assists, avg: avg.avgAssists, threshold: 2 },
    { val: game.steals, avg: avg.avgSteals, threshold: 1 },
    { val: game.blocks, avg: avg.avgBlocks, threshold: 1 },
  ];

  const solidCategories = categories.filter(c => c.val >= c.threshold && c.val >= c.avg * 0.8);

  if (solidCategories.length >= 4) {
    return {
      type: 'all_around',
      title: 'All-Around Impact',
      body: 'You contributed across the board and had a balanced performance.',
      statCallout: `${game.points} PTS • ${game.rebounds} REB • ${game.assists} AST`,
      icon: INSIGHT_ICONS.all_around,
    };
  }

  return null;
}

function tryAboveAverage(game: GameStats, avg: SeasonAverages, gamesCount: number): PostGameInsight | null {
  if (gamesCount < 3) return null;

  const statComparisons = [
    { label: 'points', val: game.points, avg: avg.avgPoints, abbr: 'PTS' },
    { label: 'rebounds', val: game.rebounds, avg: avg.avgRebounds, abbr: 'REB' },
    { label: 'assists', val: game.assists, avg: avg.avgAssists, abbr: 'AST' },
    { label: 'steals', val: game.steals, avg: avg.avgSteals, abbr: 'STL' },
  ];

  // Find the stat most above average (by absolute difference)
  const aboveAvg = statComparisons
    .filter(s => s.val > s.avg + 1 && s.avg > 0)
    .sort((a, b) => (b.val - b.avg) - (a.val - a.avg));

  if (aboveAvg.length > 0) {
    const best = aboveAvg[0];
    const diff = Math.round(best.val - best.avg);
    return {
      type: 'above_average',
      title: 'Impact Insight',
      body: `You had ${diff} more ${best.label} than your season average.`,
      statCallout: `${best.val} ${best.abbr}`,
      icon: INSIGHT_ICONS.above_average,
    };
  }

  // Game Score above average
  const gs = calculateGameScore(game);
  if (gs > avg.avgGameScore + 3) {
    return {
      type: 'above_average',
      title: 'Impact Insight',
      body: 'Your Game Score was higher than your usual average.',
      statCallout: `Game Score: ${gs.toFixed(1)}`,
      icon: INSIGHT_ICONS.above_average,
    };
  }

  return null;
}

function tryBounceBack(game: GameStats, previousGame: GameStats | null): PostGameInsight | null {
  if (!previousGame) return null;

  const gsNow = calculateGameScore(game);
  const gsPrev = calculateGameScore(previousGame);

  if (gsNow > gsPrev + 5) {
    return {
      type: 'bounce_back',
      title: 'Bounce-Back Game',
      body: 'You improved from your last outing and responded well.',
      statCallout: `Game Score: ${gsPrev.toFixed(1)} → ${gsNow.toFixed(1)}`,
      icon: INSIGHT_ICONS.bounce_back,
    };
  }

  if (game.turnovers < previousGame.turnovers - 2 && game.assists > previousGame.assists) {
    return {
      type: 'bounce_back',
      title: 'Bounce-Back Game',
      body: 'You took better care of the ball and created more offense.',
      statCallout: `${game.assists} AST • ${game.turnovers} TOV`,
      icon: INSIGHT_ICONS.bounce_back,
    };
  }

  return null;
}

function tryConsistency(game: GameStats, allGames: GameStats[], streakCount: number): PostGameInsight | null {
  if (streakCount >= 3) {
    return {
      type: 'consistency',
      title: 'Consistency Insight',
      body: `You're building momentum with ${streakCount} games logged in a row.`,
      statCallout: `🔥 ${streakCount} Game Streak`,
      icon: INSIGHT_ICONS.consistency,
    };
  }

  // Check for consecutive solid games (10+ points in last 3)
  if (allGames.length >= 3) {
    const sorted = [...allGames].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last3 = sorted.slice(0, 3);
    if (last3.every(g => g.points >= 10)) {
      return {
        type: 'consistency',
        title: 'Consistency Insight',
        body: "You've scored 10+ points in each of your last 3 games.",
        statCallout: last3.map(g => `${g.points} PTS`).join(' • '),
        icon: INSIGHT_ICONS.consistency,
      };
    }
  }

  return null;
}

const FALLBACK_INSIGHT: PostGameInsight = {
  type: 'fallback',
  title: 'Solid Game Logged',
  body: 'Another performance added to your season record. Keep building.',
  icon: INSIGHT_ICONS.fallback,
};

/**
 * Generate the best post-game insight for a given game.
 * Uses priority-based rules to pick the single most relevant insight.
 */
export function generatePostGameInsight(
  game: GameStats,
  allGames: GameStats[],
  streakCount: number = 0
): PostGameInsight {
  // Exclude the current game from averages
  const otherGames = allGames.filter(g => g.id !== game.id);
  const avg = computeAverages(otherGames);
  const gamesCount = otherGames.length;

  // Previous game by date
  const sorted = [...otherGames].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const previousGame = sorted.length > 0 ? sorted[0] : null;

  // Try each insight type in priority order
  const generators: Record<InsightType, () => PostGameInsight | null> = {
    career_high: () => tryCareerHigh(game, allGames),
    efficiency: () => tryEfficiency(game, avg, gamesCount),
    playmaking: () => tryPlaymaking(game, avg, gamesCount),
    defensive_impact: () => tryDefensiveImpact(game, avg, gamesCount),
    all_around: () => tryAllAround(game, avg, gamesCount),
    above_average: () => tryAboveAverage(game, avg, gamesCount),
    bounce_back: () => tryBounceBack(game, previousGame),
    consistency: () => tryConsistency(game, allGames, streakCount),
    fallback: () => FALLBACK_INSIGHT,
  };

  for (const type of INSIGHT_PRIORITY) {
    const result = generators[type]();
    if (result) return result;
  }

  return FALLBACK_INSIGHT;
}

export function getInsightIcon(type: InsightType): string {
  return INSIGHT_ICONS[type] || '📋';
}
