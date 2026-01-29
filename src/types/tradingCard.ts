export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'hof';
export type BadgeCategory = 'finishing' | 'shooting' | 'playmaking' | 'defense' | 'rebounding';
export type CardRarity = 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite';

export interface BadgeDefinition {
  id: string;
  name: string;
  category: BadgeCategory;
  icon: string;
  description: string;
  bronze_threshold: Record<string, number | boolean>;
  silver_threshold: Record<string, number | boolean>;
  gold_threshold: Record<string, number | boolean>;
  hof_threshold: Record<string, number | boolean>;
}

export interface EarnedBadge {
  name: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string;
  description: string;
}

export interface PlayerBadge {
  id: string;
  user_id: string;
  badge_name: string;
  badge_category: BadgeCategory;
  tier: BadgeTier;
  season_id: string | null;
  earned_at: string;
}

export interface TradingCard {
  id: string;
  user_id: string;
  season_id: string | null;
  rarity: CardRarity;
  overall_rating: number;
  offense_rating: number;
  defense_rating: number;
  playmaking_rating: number;
  athleticism_rating: number;
  iq_rating: number;
  player_title: string | null;
  scouting_report: string | null;
  stats_snapshot: StatsSnapshot;
  badges_earned: EarnedBadge[];
  games_played: number;
  created_at: string;
}

export interface StatsSnapshot {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fg_pct: number;
  three_pct: number;
  ft_pct: number;
}

export interface CardRatings {
  overall: number;
  offense: number;
  defense: number;
  playmaking: number;
  athleticism: number;
  iq: number;
}

export interface GenerateCardRequest {
  seasonStats: {
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
  };
  profile: {
    name: string;
    team: string;
    position: string;
    number: number;
    grade: string;
    avatar_url?: string;
  };
  seasonId?: string;
}

export interface GenerateCardResponse {
  card: TradingCard;
  badges: EarnedBadge[];
}

// Tier styling helpers
export const TIER_COLORS: Record<BadgeTier, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-800', text: 'text-amber-100', border: 'border-amber-600' },
  silver: { bg: 'bg-slate-400', text: 'text-slate-900', border: 'border-slate-300' },
  gold: { bg: 'bg-yellow-500', text: 'text-yellow-900', border: 'border-yellow-400' },
  hof: { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-400' },
};

export const RARITY_STYLES: Record<CardRarity, { gradient: string; border: string; glow: string }> = {
  bronze: {
    gradient: 'from-amber-900 to-amber-700',
    border: 'border-amber-600',
    glow: '',
  },
  silver: {
    gradient: 'from-slate-400 to-slate-300',
    border: 'border-slate-300',
    glow: 'shadow-lg shadow-slate-400/30',
  },
  gold: {
    gradient: 'from-yellow-500 to-amber-400',
    border: 'border-yellow-400',
    glow: 'shadow-xl shadow-yellow-500/40',
  },
  diamond: {
    gradient: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-300',
    glow: 'shadow-xl shadow-cyan-400/50',
  },
  elite: {
    gradient: 'from-purple-500 via-pink-500 to-orange-400',
    border: 'border-purple-400',
    glow: 'shadow-2xl shadow-purple-500/60',
  },
};

export const RARITY_STARS: Record<CardRarity, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
  elite: 5,
};
