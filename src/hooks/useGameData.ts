import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { GameScore, UserGameStats, GameResult, GameType } from '@/types/games';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export function useGameData() {
  const { user } = useAuth();
  const [scores, setScores] = useState<GameScore[]>([]);
  const [userStats, setUserStats] = useState<UserGameStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching scores:', error);
      return;
    }
    
    setScores(data as GameScore[]);
  }, [user]);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user stats:', error);
      return;
    }
    
    setUserStats(data as UserGameStats | null);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchScores(), fetchUserStats()]).finally(() => setLoading(false));
    } else {
      setScores([]);
      setUserStats(null);
      setLoading(false);
    }
  }, [user, fetchScores, fetchUserStats]);

  const saveGameResult = async (result: GameResult): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to save game results');
      return false;
    }

    try {
      // Save the game score
      const { error: scoreError } = await supabase
        .from('game_scores')
        .insert([{
          user_id: user.id,
          game_type: result.game_type,
          score: result.score,
          metadata: result.metadata as Json,
        }]);

      if (scoreError) throw scoreError;

      // Update or create user stats
      await updateUserStats(result);
      
      // Refresh data
      await Promise.all([fetchScores(), fetchUserStats()]);
      
      return true;
    } catch (error) {
      console.error('Error saving game result:', error);
      toast.error('Failed to save game result');
      return false;
    }
  };

  const updateUserStats = async (result: GameResult) => {
    if (!user) return;

    const now = new Date().toISOString();
    
    // Check if user has stats record
    const { data: existingStats } = await supabase
      .from('user_game_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingStats) {
      // Create new stats record
      const newStats = {
        user_id: user.id,
        total_points: result.score,
        games_played: 1,
        last_played_at: now,
        current_streak: 1,
        longest_streak: 1,
        free_throw_high_score: result.game_type === 'free_throw' ? result.score : 0,
        memory_match_best_time: result.game_type === 'memory_match' && result.metadata.time_seconds 
          ? (result.metadata.time_seconds as number) : null,
        reaction_best_time: result.game_type === 'reaction_drill' && result.metadata.avg_reaction_time
          ? (result.metadata.avg_reaction_time as number) : null,
        trivia_accuracy: result.game_type === 'trivia' && result.metadata.accuracy
          ? (result.metadata.accuracy as number) : null,
      };

      await supabase.from('user_game_stats').insert([newStats]);
    } else {
      // Update existing stats
      const stats = existingStats as UserGameStats;
      const updates: Record<string, unknown> = {
        total_points: stats.total_points + result.score,
        games_played: stats.games_played + 1,
        last_played_at: now,
      };

      // Calculate streak
      const lastPlayed = stats.last_played_at ? new Date(stats.last_played_at) : null;
      const today = new Date();
      if (lastPlayed) {
        const daysSince = Math.floor((today.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince === 1) {
          updates.current_streak = ((stats.current_streak || 0) + 1);
          updates.longest_streak = Math.max(updates.current_streak as number, stats.longest_streak || 0);
        } else if (daysSince > 1) {
          updates.current_streak = 1;
        }
      }

      // Update game-specific high scores
      if (result.game_type === 'free_throw' && result.score > (stats.free_throw_high_score || 0)) {
        updates.free_throw_high_score = result.score;
      }
      if (result.game_type === 'memory_match' && result.metadata.time_seconds) {
        const time = result.metadata.time_seconds as number;
        if (!stats.memory_match_best_time || time < stats.memory_match_best_time) {
          updates.memory_match_best_time = time;
        }
      }
      if (result.game_type === 'reaction_drill' && result.metadata.avg_reaction_time) {
        const time = result.metadata.avg_reaction_time as number;
        if (!stats.reaction_best_time || time < stats.reaction_best_time) {
          updates.reaction_best_time = time;
        }
      }
      if (result.game_type === 'trivia' && result.metadata.accuracy) {
        const accuracy = result.metadata.accuracy as number;
        // Calculate running average
        const totalGames = scores.filter(s => s.game_type === 'trivia').length;
        const currentAvg = stats.trivia_accuracy || 0;
        updates.trivia_accuracy = ((currentAvg * totalGames) + accuracy) / (totalGames + 1);
      }

      await supabase
        .from('user_game_stats')
        .update(updates)
        .eq('user_id', user.id);
    }
  };

  const getHighScore = (gameType: GameType): number => {
    const gameScores = scores.filter(s => s.game_type === gameType);
    if (gameScores.length === 0) return 0;
    return Math.max(...gameScores.map(s => s.score));
  };

  const getRecentScores = (gameType: GameType, limit: number = 10): GameScore[] => {
    return scores.filter(s => s.game_type === gameType).slice(0, limit);
  };

  return {
    scores,
    userStats,
    loading,
    saveGameResult,
    getHighScore,
    getRecentScores,
    refetch: () => Promise.all([fetchScores(), fetchUserStats()]),
  };
}
