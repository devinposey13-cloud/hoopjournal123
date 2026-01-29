import type { EarnedBadge, BadgeTier, CardRarity, CardRatings, StatsSnapshot } from '@/types/tradingCard';

interface SeasonStats {
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
  threePtPercentage: number;
  ftPercentage: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgTurnovers?: number;
}

// Badge definitions with thresholds
const BADGE_DEFINITIONS = {
  // Finishing Badges
  posterizer: {
    name: 'Posterizer',
    category: 'finishing' as const,
    icon: 'flame',
    description: 'Dominant scorer who attacks the rim with power',
    thresholds: {
      bronze: { ppg: 10, fg_pct: 40 },
      silver: { ppg: 15, fg_pct: 45 },
      gold: { ppg: 20, fg_pct: 50 },
      hof: { ppg: 25, fg_pct: 55 },
    },
  },
  paintBeast: {
    name: 'Paint Beast',
    category: 'finishing' as const,
    icon: 'target',
    description: 'Dominates in the paint with scoring and rebounding',
    thresholds: {
      bronze: { ppg: 8, rpg: 5 },
      silver: { ppg: 12, rpg: 7 },
      gold: { ppg: 16, rpg: 9 },
      hof: { ppg: 20, rpg: 12 },
    },
  },
  contactFinisher: {
    name: 'Contact Finisher',
    category: 'finishing' as const,
    icon: 'zap',
    description: 'Finishes through contact with ease',
    thresholds: {
      bronze: { ppg: 12, fg_pct: 42 },
      silver: { ppg: 16, fg_pct: 46 },
      gold: { ppg: 20, fg_pct: 50 },
      hof: { ppg: 24, fg_pct: 54 },
    },
  },

  // Shooting Badges
  deadeye: {
    name: 'Deadeye',
    category: 'shooting' as const,
    icon: 'crosshair',
    description: 'Deadly shooter from beyond the arc',
    thresholds: {
      bronze: { three_pct: 30 },
      silver: { three_pct: 35 },
      gold: { three_pct: 40 },
      hof: { three_pct: 45 },
    },
  },
  limitlessRange: {
    name: 'Limitless Range',
    category: 'shooting' as const,
    icon: 'target',
    description: 'Can score from anywhere on the court',
    thresholds: {
      bronze: { three_pct: 28, ppg: 8 },
      silver: { three_pct: 33, ppg: 12 },
      gold: { three_pct: 38, ppg: 16 },
      hof: { three_pct: 43, ppg: 20 },
    },
  },
  clutchShooter: {
    name: 'Clutch Shooter',
    category: 'shooting' as const,
    icon: 'star',
    description: 'Ice in their veins from the free throw line',
    thresholds: {
      bronze: { ft_pct: 70 },
      silver: { ft_pct: 78 },
      gold: { ft_pct: 85 },
      hof: { ft_pct: 92 },
    },
  },

  // Playmaking Badges
  dimer: {
    name: 'Dimer',
    category: 'playmaking' as const,
    icon: 'users',
    description: 'Elite passer who makes teammates better',
    thresholds: {
      bronze: { apg: 3 },
      silver: { apg: 5 },
      gold: { apg: 8 },
      hof: { apg: 12 },
    },
  },
  floorGeneral: {
    name: 'Floor General',
    category: 'playmaking' as const,
    icon: 'crown',
    description: 'Commands the offense with high basketball IQ',
    thresholds: {
      bronze: { apg: 4, ast_to_ratio: 1.5 },
      silver: { apg: 6, ast_to_ratio: 2 },
      gold: { apg: 8, ast_to_ratio: 2.5 },
      hof: { apg: 10, ast_to_ratio: 3 },
    },
  },
  handlesForDays: {
    name: 'Handles for Days',
    category: 'playmaking' as const,
    icon: 'move',
    description: 'Takes care of the ball while creating plays',
    thresholds: {
      bronze: { apg: 3, low_to: 3 },
      silver: { apg: 5, low_to: 2.5 },
      gold: { apg: 7, low_to: 2 },
      hof: { apg: 10, low_to: 1.5 },
    },
  },

  // Defense Badges
  interceptor: {
    name: 'Interceptor',
    category: 'defense' as const,
    icon: 'shield',
    description: 'Ball hawk who disrupts passing lanes',
    thresholds: {
      bronze: { spg: 1 },
      silver: { spg: 1.5 },
      gold: { spg: 2 },
      hof: { spg: 3 },
    },
  },
  rimProtector: {
    name: 'Rim Protector',
    category: 'defense' as const,
    icon: 'shield-check',
    description: 'Intimidating presence protecting the paint',
    thresholds: {
      bronze: { bpg: 1 },
      silver: { bpg: 1.5 },
      gold: { bpg: 2 },
      hof: { bpg: 3 },
    },
  },
  pickPocket: {
    name: 'Pick Pocket',
    category: 'defense' as const,
    icon: 'hand',
    description: 'Quick hands that create turnovers',
    thresholds: {
      bronze: { spg: 1.2 },
      silver: { spg: 1.8 },
      gold: { spg: 2.5 },
      hof: { spg: 3.5 },
    },
  },

  // Rebounding Badges
  reboundChaser: {
    name: 'Rebound Chaser',
    category: 'rebounding' as const,
    icon: 'arrow-up',
    description: 'Relentless on the glass',
    thresholds: {
      bronze: { rpg: 5 },
      silver: { rpg: 7 },
      gold: { rpg: 10 },
      hof: { rpg: 14 },
    },
  },
  boxOutBeast: {
    name: 'Box Out Beast',
    category: 'rebounding' as const,
    icon: 'square',
    description: 'Controls the boards with positioning',
    thresholds: {
      bronze: { rpg: 6 },
      silver: { rpg: 8 },
      gold: { rpg: 11 },
      hof: { rpg: 15 },
    },
  },
  putbackBoss: {
    name: 'Putback Boss',
    category: 'rebounding' as const,
    icon: 'repeat',
    description: 'Scores on offensive rebounds',
    thresholds: {
      bronze: { rpg: 4, ppg: 8 },
      silver: { rpg: 6, ppg: 12 },
      gold: { rpg: 8, ppg: 16 },
      hof: { rpg: 10, ppg: 20 },
    },
  },
};

function meetsThreshold(
  stats: SeasonStats,
  threshold: Record<string, number | boolean>
): boolean {
  const avgTurnovers = stats.avgTurnovers ?? 2;
  const astToRatio = avgTurnovers > 0 ? stats.avgAssists / avgTurnovers : stats.avgAssists;

  for (const [key, value] of Object.entries(threshold)) {
    switch (key) {
      case 'ppg':
        if (stats.avgPoints < (value as number)) return false;
        break;
      case 'rpg':
        if (stats.avgRebounds < (value as number)) return false;
        break;
      case 'apg':
        if (stats.avgAssists < (value as number)) return false;
        break;
      case 'spg':
        if (stats.avgSteals < (value as number)) return false;
        break;
      case 'bpg':
        if (stats.avgBlocks < (value as number)) return false;
        break;
      case 'fg_pct':
        if (stats.fgPercentage < (value as number)) return false;
        break;
      case 'three_pct':
        if (stats.threePtPercentage < (value as number)) return false;
        break;
      case 'ft_pct':
        if (stats.ftPercentage < (value as number)) return false;
        break;
      case 'ast_to_ratio':
        if (astToRatio < (value as number)) return false;
        break;
      case 'low_to':
        if (avgTurnovers > (value as number)) return false;
        break;
    }
  }
  return true;
}

function getBadgeTier(
  stats: SeasonStats,
  thresholds: Record<BadgeTier, Record<string, number | boolean>>
): BadgeTier | null {
  // Check from highest to lowest
  if (meetsThreshold(stats, thresholds.hof)) return 'hof';
  if (meetsThreshold(stats, thresholds.gold)) return 'gold';
  if (meetsThreshold(stats, thresholds.silver)) return 'silver';
  if (meetsThreshold(stats, thresholds.bronze)) return 'bronze';
  return null;
}

export function calculatePlayerBadges(stats: SeasonStats): EarnedBadge[] {
  // Require minimum 3 games to earn badges
  if (stats.gamesPlayed < 3) return [];

  const earnedBadges: EarnedBadge[] = [];

  for (const badge of Object.values(BADGE_DEFINITIONS)) {
    const tier = getBadgeTier(stats, badge.thresholds);
    if (tier) {
      earnedBadges.push({
        name: badge.name,
        category: badge.category,
        tier,
        icon: badge.icon,
        description: badge.description,
      });
    }
  }

  // Sort by tier (HOF first) then by category
  const tierOrder: Record<BadgeTier, number> = { hof: 0, gold: 1, silver: 2, bronze: 3 };
  earnedBadges.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return earnedBadges;
}

export function calculateCardRatings(stats: SeasonStats): CardRatings {
  // Normalize stats to 0-99 scale with realistic caps for youth basketball
  const normalize = (value: number, max: number, weight: number = 1): number => {
    return Math.min(99, Math.round((value / max) * 99 * weight));
  };

  // Offense: PPG, FG%, 3P%, FT%
  const offenseRaw = 
    normalize(stats.avgPoints, 30, 0.4) +
    normalize(stats.fgPercentage, 60, 0.25) +
    normalize(stats.threePtPercentage, 50, 0.2) +
    normalize(stats.ftPercentage, 100, 0.15);
  const offense = Math.min(99, Math.round(offenseRaw));

  // Defense: SPG, BPG, RPG (defensive component)
  const defenseRaw =
    normalize(stats.avgSteals, 4, 0.35) +
    normalize(stats.avgBlocks, 4, 0.35) +
    normalize(stats.avgRebounds, 15, 0.3);
  const defense = Math.min(99, Math.round(defenseRaw));

  // Playmaking: APG, AST/TO ratio (estimated)
  const avgTurnovers = stats.avgTurnovers ?? 2;
  const astToRatio = avgTurnovers > 0 ? stats.avgAssists / avgTurnovers : stats.avgAssists;
  const playmakingRaw =
    normalize(stats.avgAssists, 12, 0.6) +
    normalize(Math.min(astToRatio, 5), 5, 0.4);
  const playmaking = Math.min(99, Math.round(playmakingRaw));

  // Athleticism: Steals, Blocks, Minutes proxy (use games played as intensity)
  const athleticismRaw =
    normalize(stats.avgSteals, 4, 0.3) +
    normalize(stats.avgBlocks, 4, 0.3) +
    normalize(stats.avgPoints + stats.avgRebounds, 35, 0.4);
  const athleticism = Math.min(99, Math.round(athleticismRaw));

  // IQ: FG%, Win%, Low TO
  const winPct = stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 50;
  const toBonus = avgTurnovers < 2 ? 20 : avgTurnovers < 3 ? 10 : 0;
  const iqRaw =
    normalize(stats.fgPercentage, 60, 0.4) +
    normalize(winPct, 100, 0.3) +
    toBonus * 0.3;
  const iq = Math.min(99, Math.round(iqRaw));

  // Overall: Weighted average
  const overall = Math.round(
    offense * 0.25 +
    defense * 0.2 +
    playmaking * 0.2 +
    athleticism * 0.15 +
    iq * 0.2
  );

  return {
    overall: Math.min(99, overall),
    offense: Math.min(99, offense),
    defense: Math.min(99, defense),
    playmaking: Math.min(99, playmaking),
    athleticism: Math.min(99, athleticism),
    iq: Math.min(99, iq),
  };
}

export function determineCardRarity(
  stats: SeasonStats,
  badges: EarnedBadge[],
  ratings: CardRatings
): CardRarity {
  const hofBadges = badges.filter(b => b.tier === 'hof').length;
  const goldBadges = badges.filter(b => b.tier === 'gold').length;
  const totalBadges = badges.length;

  // Elite: 25+ games, OVR 85+, at least 2 HOF badges
  if (stats.gamesPlayed >= 25 && ratings.overall >= 85 && hofBadges >= 2) {
    return 'elite';
  }

  // Diamond: 20+ games, OVR 80+, at least 1 HOF or 3+ gold badges
  if (stats.gamesPlayed >= 20 && ratings.overall >= 80 && (hofBadges >= 1 || goldBadges >= 3)) {
    return 'diamond';
  }

  // Gold: 15+ games, OVR 70+, at least 2 gold badges
  if (stats.gamesPlayed >= 15 && ratings.overall >= 70 && goldBadges >= 2) {
    return 'gold';
  }

  // Silver: 10+ games, OVR 60+, at least 3 total badges
  if (stats.gamesPlayed >= 10 && ratings.overall >= 60 && totalBadges >= 3) {
    return 'silver';
  }

  // Bronze: Default
  return 'bronze';
}

export function createStatsSnapshot(stats: SeasonStats): StatsSnapshot {
  return {
    ppg: Math.round(stats.avgPoints * 10) / 10,
    rpg: Math.round(stats.avgRebounds * 10) / 10,
    apg: Math.round(stats.avgAssists * 10) / 10,
    spg: Math.round(stats.avgSteals * 10) / 10,
    bpg: Math.round(stats.avgBlocks * 10) / 10,
    fg_pct: Math.round(stats.fgPercentage * 10) / 10,
    three_pct: Math.round(stats.threePtPercentage * 10) / 10,
    ft_pct: Math.round(stats.ftPercentage * 10) / 10,
  };
}
