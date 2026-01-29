import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Achievement, UserAchievement, GameResult } from '@/types/games';
import { toast } from 'sonner';

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('points', { ascending: true });
    
    if (error) {
      console.error('Error fetching achievements:', error);
      return;
    }
    
    setAchievements(data as Achievement[]);
  }, []);

  const fetchUserAchievements = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching user achievements:', error);
      return;
    }
    
    setUserAchievements(data as UserAchievement[]);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchAchievements().then(() => {
      if (user) {
        fetchUserAchievements().finally(() => setLoading(false));
      } else {
        setUserAchievements([]);
        setLoading(false);
      }
    });
  }, [user, fetchAchievements, fetchUserAchievements]);

  const unlockAchievement = async (achievementId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Check if already unlocked
    if (userAchievements.some(ua => ua.achievement_id === achievementId)) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
        });

      if (error) throw error;

      const achievement = achievements.find(a => a.id === achievementId);
      if (achievement) {
        toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
          description: `+${achievement.points} points`,
        });
      }

      await fetchUserAchievements();
      return true;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  };

  const checkAndUnlockAchievements = async (
    result: GameResult,
    userStats: { games_played: number; current_streak: number }
  ): Promise<Achievement[]> => {
    const unlocked: Achievement[] = [];

    for (const achievement of achievements) {
      // Skip if already unlocked
      if (userAchievements.some(ua => ua.achievement_id === achievement.id)) {
        continue;
      }

      let shouldUnlock = false;

      switch (achievement.name) {
        case 'First Timer':
          shouldUnlock = userStats.games_played === 0; // First game
          break;
        case 'Sharpshooter':
          shouldUnlock = result.game_type === 'free_throw' && result.score >= 100;
          break;
        case 'Memory Master':
          shouldUnlock = result.game_type === 'memory_match' && 
            result.metadata.grid_size === '8x8' &&
            (result.metadata.time_seconds as number) < 60;
          break;
        case 'Quick Reflexes':
          shouldUnlock = result.game_type === 'reaction_drill' &&
            (result.metadata.avg_reaction_time as number) < 300;
          break;
        case 'Trivia Champion':
          shouldUnlock = result.game_type === 'trivia' &&
            (result.metadata.streak as number) >= 20;
          break;
        case 'Prediction Pro':
          shouldUnlock = result.game_type === 'stats_predictor' &&
            (result.metadata.accurate_streak as number) >= 5;
          break;
        case '7-Day Streak':
          shouldUnlock = userStats.current_streak >= 7;
          break;
        case '30-Day Warrior':
          shouldUnlock = userStats.current_streak >= 30;
          break;
      }

      if (shouldUnlock) {
        const success = await unlockAchievement(achievement.id);
        if (success) {
          unlocked.push(achievement);
        }
      }
    }

    return unlocked;
  };

  const isUnlocked = (achievementId: string): boolean => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getTotalPoints = (): number => {
    return userAchievements.reduce((total, ua) => {
      const achievement = achievements.find(a => a.id === ua.achievement_id);
      return total + (achievement?.points || 0);
    }, 0);
  };

  const getUnlockedCount = (): number => {
    return userAchievements.length;
  };

  return {
    achievements,
    userAchievements,
    loading,
    unlockAchievement,
    checkAndUnlockAchievements,
    isUnlocked,
    getTotalPoints,
    getUnlockedCount,
    refetch: () => Promise.all([fetchAchievements(), fetchUserAchievements()]),
  };
}
