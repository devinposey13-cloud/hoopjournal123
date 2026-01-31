export interface PlayerTeam {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
  created_at: string;
}

export interface GameStats {
  id: string;
  date: string;
  opponent: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutesPlayed: number;
  fgMade: number;
  fgAttempted: number;
  threePtMade: number;
  threePtAttempted: number;
  ftMade: number;
  ftAttempted: number;
  isWin: boolean;
  offensiveRebounds?: number;
  defensiveRebounds?: number;
  gamePhotoUrl?: string;
  teamId?: string;
  teamName?: string;
  halftimeScoreUs?: number;
  halftimeScoreThem?: number;
  finalScoreUs?: number;
  finalScoreThem?: number;
}

export interface HalfStats {
  points: number;
  fgMade: number;
  fgAttempted: number;
  threePtMade: number;
  threePtAttempted: number;
  ftMade: number;
  ftAttempted: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

export interface VideoClip {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  date: string;
  gameId?: string;
  isPublic?: boolean;
  playerName?: string;
  playerTeam?: string;
}

export interface PlayerProfile {
  name: string;
  team: string;
  position: string;
  number: number;
  height: string;
  grade: string;
  avatar?: string;
  username?: string;
  displayName?: string;
  isProfilePublic?: boolean;
  themeMusicUrl?: string;
  instagramUrl?: string;
  avatarSkippedAt?: string;
  // Onboarding fields
  courtRole?: string;
  playingLevel?: string;
  seasonGoals?: string[];
  parentEmail?: string;
  onboardingCompletedAt?: string;
  // Notification preferences
  receiveGameSummaries?: boolean;
}

export interface SeasonStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
  threePtPercentage: number;
  ftPercentage: number;
}

export interface ScheduledGame {
  id: string;
  date: string;
  time: string;
  opponent: string;
  location: string;
  isHome: boolean;
  notes?: string;
  tournament?: string;
  teamId?: string;
  teamName?: string;
}

export interface Season {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}
