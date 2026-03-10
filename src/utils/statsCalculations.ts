import type { GameStats } from '@/types/basketball';
import { format } from 'date-fns';
import { calculateGameScore } from '@/utils/gameGrading';

export interface CareerHigh {
  stat: string;
  value: number;
  displayValue: string;
  opponent: string;
  date: string;
  gameId: string;
  icon: string;
  category: 'counting' | 'percentage' | 'composite';
}

export interface StatSplit {
  label: string;
  gamesPlayed: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
  threePtPercentage: number;
  ftPercentage: number;
  winPercentage: number;
}

export interface AdvancedStats {
  trueShootingPercentage: number;
  assistToTurnoverRatio: number;
  pointsResponsibility: number;
  efficiencyRating: number;
  reboundRate: number;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  isUp: boolean;
}

// Calculate career highs across all games
export function calculateCareerHighs(games: GameStats[]): CareerHigh[] {
  if (games.length === 0) return [];

  const results: CareerHigh[] = [];

  // Counting stats
  const countingStats: { key: keyof GameStats; label: string; icon: string }[] = [
    { key: 'points', label: 'Points', icon: '🔥' },
    { key: 'assists', label: 'Assists', icon: '🎯' },
    { key: 'rebounds', label: 'Rebounds', icon: '💪' },
    { key: 'steals', label: 'Steals', icon: '🔒' },
    { key: 'blocks', label: 'Blocks', icon: '🛡️' },
  ];

  for (const { key, label, icon } of countingStats) {
    const highGame = games.reduce((best, game) => {
      const cv = game[key] as number;
      const bv = best[key] as number;
      return cv > bv ? game : best;
    }, games[0]);
    const val = highGame[key] as number;
    if (val > 0) {
      results.push({
        stat: label, value: val, displayValue: String(val),
        opponent: highGame.opponent, date: highGame.date, gameId: highGame.id,
        icon, category: 'counting',
      });
    }
  }

  // FG% (min 5 FGA)
  const fgEligible = games.filter(g => g.fgAttempted >= 5);
  if (fgEligible.length > 0) {
    const best = fgEligible.reduce((b, g) => {
      const gPct = g.fgMade / g.fgAttempted;
      const bPct = b.fgMade / b.fgAttempted;
      return gPct > bPct ? g : b;
    }, fgEligible[0]);
    const pct = Math.round((best.fgMade / best.fgAttempted) * 100);
    results.push({
      stat: 'FG%', value: pct, displayValue: `${pct}%`,
      opponent: best.opponent, date: best.date, gameId: best.id,
      icon: '🏀', category: 'percentage',
    });
  }

  // FT% (min 3 FTA)
  const ftEligible = games.filter(g => g.ftAttempted >= 3);
  if (ftEligible.length > 0) {
    const best = ftEligible.reduce((b, g) => {
      const gPct = g.ftMade / g.ftAttempted;
      const bPct = b.ftMade / b.ftAttempted;
      return gPct > bPct ? g : b;
    }, ftEligible[0]);
    const pct = Math.round((best.ftMade / best.ftAttempted) * 100);
    results.push({
      stat: 'FT%', value: pct, displayValue: `${pct}%`,
      opponent: best.opponent, date: best.date, gameId: best.id,
      icon: '🎯', category: 'percentage',
    });
  }

  // Game Score
  const bestGS = games.reduce((b, g) => {
    return calculateGameScore(g) > calculateGameScore(b) ? g : b;
  }, games[0]);
  const gsVal = calculateGameScore(bestGS);
  if (gsVal > 0) {
    results.push({
      stat: 'Game Score', value: gsVal, displayValue: String(gsVal),
      opponent: bestGS.opponent, date: bestGS.date, gameId: bestGS.id,
      icon: '⭐', category: 'composite',
    });
  }

  // Efficiency = PTS + REB + AST + STL + BLK - TOV
  const calcEff = (g: GameStats) => g.points + g.rebounds + g.assists + g.steals + g.blocks - g.turnovers;
  const bestEff = games.reduce((b, g) => calcEff(g) > calcEff(b) ? g : b, games[0]);
  const effVal = calcEff(bestEff);
  if (effVal > 0) {
    results.push({
      stat: 'Efficiency', value: effVal, displayValue: String(effVal),
      opponent: bestEff.opponent, date: bestEff.date, gameId: bestEff.id,
      icon: '📈', category: 'composite',
    });
  }

  return results;
}

// Detect new career highs comparing a single game against existing highs
export function detectNewCareerHighs(game: GameStats, allGames: GameStats[]): CareerHigh[] {
  const currentHighs = calculateCareerHighs(allGames);
  return currentHighs.filter(h => h.gameId === game.id);
}

// Calculate perfect games (special achievements)
export function findPerfectGames(games: GameStats[]): { type: string; games: GameStats[] }[] {
  const perfectCategories: { type: string; games: GameStats[] }[] = [];

  // Games with 0 turnovers and at least 10 points
  const noTurnoverGames = games.filter(g => g.turnovers === 0 && g.points >= 10);
  if (noTurnoverGames.length > 0) {
    perfectCategories.push({ type: 'Zero Turnovers (10+ pts)', games: noTurnoverGames });
  }

  // Perfect from the line (min 5 attempts)
  const perfectFtGames = games.filter(g => g.ftAttempted >= 5 && g.ftMade === g.ftAttempted);
  if (perfectFtGames.length > 0) {
    perfectCategories.push({ type: 'Perfect Free Throws (5+ FTA)', games: perfectFtGames });
  }

  // Double-doubles
  const doubleDoubles = games.filter(g => {
    const stats = [g.points, g.rebounds, g.assists, g.steals, g.blocks];
    const doubleFigures = stats.filter(s => s >= 10);
    return doubleFigures.length >= 2;
  });
  if (doubleDoubles.length > 0) {
    perfectCategories.push({ type: 'Double-Doubles', games: doubleDoubles });
  }

  return perfectCategories;
}

// Calculate splits (home vs away requires scheduled game data)
export function calculateWinLossSplits(games: GameStats[]): { wins: StatSplit; losses: StatSplit } {
  const winGames = games.filter(g => g.isWin);
  const lossGames = games.filter(g => !g.isWin);

  return {
    wins: calculateSplitStats(winGames, 'In Wins'),
    losses: calculateSplitStats(lossGames, 'In Losses'),
  };
}

// Calculate by opponent splits
export function calculateOpponentSplits(games: GameStats[]): StatSplit[] {
  const opponents = [...new Set(games.map(g => g.opponent))];
  
  return opponents
    .map(opponent => {
      const opponentGames = games.filter(g => g.opponent === opponent);
      return calculateSplitStats(opponentGames, `vs ${opponent}`);
    })
    .filter(split => split.gamesPlayed >= 1)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .slice(0, 10); // Top 10 most frequent opponents
}

// Calculate by month splits
export function calculateMonthSplits(games: GameStats[]): StatSplit[] {
  const monthGroups: Record<string, GameStats[]> = {};

  games.forEach(game => {
    const month = format(new Date(game.date), 'MMMM yyyy');
    if (!monthGroups[month]) {
      monthGroups[month] = [];
    }
    monthGroups[month].push(game);
  });

  return Object.entries(monthGroups)
    .map(([month, monthGames]) => calculateSplitStats(monthGames, month))
    .sort((a, b) => new Date(b.label).getTime() - new Date(a.label).getTime());
}

function calculateSplitStats(games: GameStats[], label: string): StatSplit {
  if (games.length === 0) {
    return {
      label,
      gamesPlayed: 0,
      avgPoints: 0,
      avgRebounds: 0,
      avgAssists: 0,
      avgSteals: 0,
      avgBlocks: 0,
      fgPercentage: 0,
      threePtPercentage: 0,
      ftPercentage: 0,
      winPercentage: 0,
    };
  }

  const totals = games.reduce(
    (acc, game) => ({
      points: acc.points + game.points,
      rebounds: acc.rebounds + game.rebounds,
      assists: acc.assists + game.assists,
      steals: acc.steals + game.steals,
      blocks: acc.blocks + game.blocks,
      fgMade: acc.fgMade + game.fgMade,
      fgAttempted: acc.fgAttempted + game.fgAttempted,
      threePtMade: acc.threePtMade + game.threePtMade,
      threePtAttempted: acc.threePtAttempted + game.threePtAttempted,
      ftMade: acc.ftMade + game.ftMade,
      ftAttempted: acc.ftAttempted + game.ftAttempted,
      wins: acc.wins + (game.isWin ? 1 : 0),
    }),
    {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      fgMade: 0, fgAttempted: 0, threePtMade: 0, threePtAttempted: 0,
      ftMade: 0, ftAttempted: 0, wins: 0,
    }
  );

  const n = games.length;
  return {
    label,
    gamesPlayed: n,
    avgPoints: Math.round((totals.points / n) * 10) / 10,
    avgRebounds: Math.round((totals.rebounds / n) * 10) / 10,
    avgAssists: Math.round((totals.assists / n) * 10) / 10,
    avgSteals: Math.round((totals.steals / n) * 10) / 10,
    avgBlocks: Math.round((totals.blocks / n) * 10) / 10,
    fgPercentage: totals.fgAttempted > 0 ? Math.round((totals.fgMade / totals.fgAttempted) * 1000) / 10 : 0,
    threePtPercentage: totals.threePtAttempted > 0 ? Math.round((totals.threePtMade / totals.threePtAttempted) * 1000) / 10 : 0,
    ftPercentage: totals.ftAttempted > 0 ? Math.round((totals.ftMade / totals.ftAttempted) * 1000) / 10 : 0,
    winPercentage: Math.round((totals.wins / n) * 100),
  };
}

// Calculate advanced stats
export function calculateAdvancedStats(games: GameStats[]): AdvancedStats {
  if (games.length === 0) {
    return {
      trueShootingPercentage: 0,
      assistToTurnoverRatio: 0,
      pointsResponsibility: 0,
      efficiencyRating: 0,
      reboundRate: 0,
    };
  }

  const totals = games.reduce(
    (acc, g) => ({
      points: acc.points + g.points,
      fgAttempted: acc.fgAttempted + g.fgAttempted,
      ftAttempted: acc.ftAttempted + g.ftAttempted,
      assists: acc.assists + g.assists,
      turnovers: acc.turnovers + g.turnovers,
      rebounds: acc.rebounds + g.rebounds,
      steals: acc.steals + g.steals,
      blocks: acc.blocks + g.blocks,
      fgMade: acc.fgMade + g.fgMade,
      ftMade: acc.ftMade + g.ftMade,
    }),
    { points: 0, fgAttempted: 0, ftAttempted: 0, assists: 0, turnovers: 0, rebounds: 0, steals: 0, blocks: 0, fgMade: 0, ftMade: 0 }
  );

  const n = games.length;

  // True Shooting % = Points / (2 * (FGA + 0.44 * FTA)) * 100
  const tsaDenominator = 2 * (totals.fgAttempted + 0.44 * totals.ftAttempted);
  const trueShootingPercentage = tsaDenominator > 0 
    ? Math.round((totals.points / tsaDenominator) * 1000) / 10 
    : 0;

  // Assist to Turnover Ratio
  const assistToTurnoverRatio = totals.turnovers > 0 
    ? Math.round((totals.assists / totals.turnovers) * 100) / 100 
    : totals.assists;

  // Points Responsibility = (Points + Assists * 2) per game
  const pointsResponsibility = Math.round(((totals.points + totals.assists * 2) / n) * 10) / 10;

  // Simple Efficiency Rating = (PTS + REB + AST + STL + BLK - TO - Missed FG - Missed FT) / Games
  const missedFg = totals.fgAttempted - totals.fgMade;
  const missedFt = totals.ftAttempted - totals.ftMade;
  const efficiencyRating = Math.round(((totals.points + totals.rebounds + totals.assists + totals.steals + totals.blocks - totals.turnovers - missedFg - missedFt) / n) * 10) / 10;

  // Rebound Rate (per game avg)
  const reboundRate = Math.round((totals.rebounds / n) * 10) / 10;

  return {
    trueShootingPercentage,
    assistToTurnoverRatio,
    pointsResponsibility,
    efficiencyRating,
    reboundRate,
  };
}

// Calculate trend compared to last N games
export function calculateTrend(games: GameStats[], stat: keyof GameStats, compareGames = 5): TrendData {
  if (games.length < 2) {
    const current = games.length === 1 ? (games[0][stat] as number) : 0;
    return { current, previous: current, change: 0, isUp: false };
  }

  // Sort by date descending (most recent first)
  const sorted = [...games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Season average (all games)
  const seasonTotal = games.reduce((acc, g) => acc + (g[stat] as number), 0);
  const seasonAvg = seasonTotal / games.length;

  // Recent games average
  const recentGames = sorted.slice(0, Math.min(compareGames, sorted.length));
  const recentTotal = recentGames.reduce((acc, g) => acc + (g[stat] as number), 0);
  const recentAvg = recentTotal / recentGames.length;

  const change = Math.round((recentAvg - seasonAvg) * 10) / 10;

  return {
    current: Math.round(recentAvg * 10) / 10,
    previous: Math.round(seasonAvg * 10) / 10,
    change: Math.abs(change),
    isUp: change >= 0,
  };
}

// Radar chart data (normalized 0-100 scale)
export function calculateRadarData(games: GameStats[]): { subject: string; value: number; fullMark: number }[] {
  if (games.length === 0) {
    return [
      { subject: 'Scoring', value: 0, fullMark: 100 },
      { subject: 'Rebounding', value: 0, fullMark: 100 },
      { subject: 'Playmaking', value: 0, fullMark: 100 },
      { subject: 'Defense', value: 0, fullMark: 100 },
      { subject: 'Efficiency', value: 0, fullMark: 100 },
      { subject: 'Consistency', value: 0, fullMark: 100 },
    ];
  }

  const n = games.length;
  const totals = games.reduce(
    (acc, g) => ({
      points: acc.points + g.points,
      rebounds: acc.rebounds + g.rebounds,
      assists: acc.assists + g.assists,
      steals: acc.steals + g.steals,
      blocks: acc.blocks + g.blocks,
      fgMade: acc.fgMade + g.fgMade,
      fgAttempted: acc.fgAttempted + g.fgAttempted,
    }),
    { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fgMade: 0, fgAttempted: 0 }
  );

  // Normalize against reasonable youth basketball maximums
  const ppg = totals.points / n;
  const rpg = totals.rebounds / n;
  const apg = totals.assists / n;
  const spg = totals.steals / n;
  const bpg = totals.blocks / n;
  const fgPct = totals.fgAttempted > 0 ? (totals.fgMade / totals.fgAttempted) * 100 : 0;

  // Calculate consistency (inverse of variance) - lower variance = higher consistency
  const pointsVariance = games.reduce((acc, g) => acc + Math.pow(g.points - ppg, 2), 0) / n;
  const consistencyScore = Math.max(0, 100 - Math.sqrt(pointsVariance) * 5);

  return [
    { subject: 'Scoring', value: Math.min(100, (ppg / 25) * 100), fullMark: 100 },
    { subject: 'Rebounding', value: Math.min(100, (rpg / 12) * 100), fullMark: 100 },
    { subject: 'Playmaking', value: Math.min(100, (apg / 8) * 100), fullMark: 100 },
    { subject: 'Defense', value: Math.min(100, ((spg + bpg) / 5) * 100), fullMark: 100 },
    { subject: 'Efficiency', value: Math.min(100, fgPct), fullMark: 100 },
    { subject: 'Consistency', value: Math.min(100, consistencyScore), fullMark: 100 },
  ];
}

// Performance over time (for line charts)
export function getPerformanceTimeline(games: GameStats[]): { date: string; points: number; rebounds: number; assists: number }[] {
  return [...games]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(g => ({
      date: format(new Date(g.date), 'MMM d'),
      points: g.points,
      rebounds: g.rebounds,
      assists: g.assists,
    }));
}
