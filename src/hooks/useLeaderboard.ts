import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderboardEntry, GameType } from '@/types/games';

export type LeaderboardType = 'all_time' | 'weekly' | 'free_throw' | 'memory_match' | 'reaction_drill' | 'trivia' | 'achievements';

export function useLeaderboard(type: LeaderboardType = 'all_time') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    
    try {
      // Get user_game_stats for public profiles with player settings
      const { data: statsData, error: statsError } = await supabase
        .from('user_game_stats')
        .select(`
          user_id,
          total_points,
          games_played,
          free_throw_high_score,
          memory_match_best_time,
          reaction_best_time,
          trivia_accuracy
        `)
        .order(getOrderColumn(type), { ascending: isAscending(type) })
        .limit(50);

      if (statsError) throw statsError;

      if (!statsData || statsData.length === 0) {
        setEntries([]);
        return;
      }

      // Get player settings for these users (only public profiles)
      const userIds = statsData.map(s => s.user_id);
      const { data: settingsData, error: settingsError } = await supabase
        .from('player_settings')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds)
        .eq('is_profile_public', true);

      if (settingsError) throw settingsError;

      // Merge data and filter to only public profiles
      const settingsMap = new Map(settingsData?.map(s => [s.user_id, s]) || []);
      
      const leaderboardEntries: LeaderboardEntry[] = statsData
        .filter(stat => settingsMap.has(stat.user_id)) // Only include public profiles
        .map((stat, index) => {
          const settings = settingsMap.get(stat.user_id);
          return {
            user_id: stat.user_id,
            display_name: settings?.display_name || 'Anonymous',
            username: null,
            avatar_url: settings?.avatar_url || null,
            total_points: stat.total_points,
            games_played: stat.games_played,
            rank: index + 1,
          };
        });

      setEntries(leaderboardEntries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    entries,
    loading,
    refetch: fetchLeaderboard,
  };
}

function getOrderColumn(type: LeaderboardType): string {
  switch (type) {
    case 'free_throw':
      return 'free_throw_high_score';
    case 'memory_match':
      return 'memory_match_best_time';
    case 'reaction_drill':
      return 'reaction_best_time';
    case 'trivia':
      return 'trivia_accuracy';
    default:
      return 'total_points';
  }
}

function isAscending(type: LeaderboardType): boolean {
  // For time-based scores, lower is better
  return type === 'memory_match' || type === 'reaction_drill';
}
