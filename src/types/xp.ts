export interface XpProgress {
  id: string;
  user_id: string;
  quarter: string;
  current_xp: number;
  current_level: number;
  peak_level: number;
  games_logged: number;
  total_performance_score: number;
  created_at: string;
  updated_at: string;
}

export interface XpHistory {
  id: string;
  user_id: string;
  quarter: string;
  final_level: number;
  total_xp_earned: number;
  games_played: number;
  avg_performance: number | null;
  archived_at: string;
}

export interface LevelReward {
  id: string;
  level_required: number;
  reward_type: 'badge' | 'title' | 'frame' | 'flair';
  reward_name: string;
  reward_icon: string;
  description: string;
}

export interface PlayerLevelReward {
  id: string;
  user_id: string;
  reward_id: string;
  unlocked_at: string;
  unlocked_quarter: string;
  reward?: LevelReward;
}

export interface PerformanceBreakdownItem {
  stat: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface PerformanceResult {
  rawScore: number;
  multiplier: number;
  finalScore: number;
  tier: PerformanceTier;
  xpEarned: number;
  breakdown: PerformanceBreakdownItem[];
  bonuses: string[];
}

export type PerformanceTier = 
  | 'starter' 
  | 'rising' 
  | 'solid' 
  | 'great'
  | 'elite' 
  | 'legendary';

export interface XpGainResult {
  previousXp: number;
  newXp: number;
  xpGained: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  levelsGained: number;
  xpToNextLevel: number;
  xpProgressInLevel: number;
  newRewards: LevelReward[];
  recoveryBonus: number;
}

export interface QuarterInfo {
  quarter: string; // e.g., "2026-Q1"
  year: number;
  quarterNum: 1 | 2 | 3 | 4;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  totalDays: number;
  progressPercent: number;
}
