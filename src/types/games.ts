export type GameType = 'stats_predictor' | 'free_throw' | 'memory_match' | 'reaction_drill' | 'trivia';

export interface GameScore {
  id: string;
  user_id: string;
  game_type: GameType;
  score: number;
  metadata: Record<string, unknown>;
  played_at: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'games' | 'stats' | 'engagement';
  requirement_type: 'single_game' | 'cumulative' | 'streak';
  requirement_value: number;
  points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface UserGameStats {
  id: string;
  user_id: string;
  total_points: number;
  games_played: number;
  free_throw_high_score: number | null;
  memory_match_best_time: number | null;
  reaction_best_time: number | null;
  trivia_accuracy: number | null;
  predictions_made: number | null;
  prediction_accuracy: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  last_played_at: string | null;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  games_played: number;
  rank: number;
}

export interface GameResult {
  game_type: GameType;
  score: number;
  metadata: Record<string, unknown>;
  achievements_unlocked?: Achievement[];
}

// Memory Match specific types
export interface MemoryCard {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Trivia specific types
export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  category: 'rules' | 'history' | 'players' | 'records';
  difficulty: 'easy' | 'medium' | 'hard';
}

// Stats Predictor specific types
export interface StatsPrediction {
  scheduled_game_id: string;
  predicted_points: number;
  predicted_rebounds: number;
  predicted_assists: number;
}
