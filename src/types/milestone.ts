export type MilestoneCategory = 'single_game' | 'multi_game' | 'season';
export type MilestoneRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  category: MilestoneCategory;
  rarity: MilestoneRarity;
  icon: string;
  checkType: string;
  threshold: number;
  secondaryThreshold?: number;
  isRepeatable?: boolean; // If true, can be earned multiple times per season
}

export interface PlayerMilestone {
  id: string;
  milestoneId: string;
  milestone?: MilestoneDefinition;
  seasonId?: string;
  gameId?: string;
  earnedAt: string;
  statsSnapshot: MilestoneStatsSnapshot;
  isViewed: boolean;
}

export interface MilestoneStatsSnapshot {
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  fgMade?: number;
  fgAttempted?: number;
  threePtMade?: number;
  ftMade?: number;
  ftAttempted?: number;
  opponent?: string;
  // Season cumulative stats
  seasonPoints?: number;
  seasonRebounds?: number;
  seasonAssists?: number;
  seasonSteals?: number;
  seasonBlocks?: number;
  seasonThrees?: number;
  gamesPlayed?: number;
}

export interface NewMilestoneResult {
  milestone: MilestoneDefinition;
  statsSnapshot: MilestoneStatsSnapshot;
  gameId?: string;
}

// Rarity styling configuration
export const RARITY_STYLES: Record<MilestoneRarity, {
  gradient: string;
  border: string;
  glow: string;
  text: string;
  bgClass: string;
}> = {
  common: {
    gradient: 'from-blue-600 to-blue-800',
    border: 'border-blue-500/50',
    glow: 'shadow-blue-500/20',
    text: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
  },
  uncommon: {
    gradient: 'from-green-500 to-emerald-700',
    border: 'border-green-500/50',
    glow: 'shadow-green-500/30',
    text: 'text-green-400',
    bgClass: 'bg-green-500/10',
  },
  rare: {
    gradient: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-500/50',
    glow: 'shadow-yellow-500/40',
    text: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10',
  },
  epic: {
    gradient: 'from-purple-500 to-violet-700',
    border: 'border-purple-500/60',
    glow: 'shadow-purple-500/50',
    text: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
  },
  legendary: {
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    border: 'border-orange-400/70',
    glow: 'shadow-orange-500/60',
    text: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
  },
};
