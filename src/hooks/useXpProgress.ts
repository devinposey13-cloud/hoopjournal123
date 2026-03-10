import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getQuarterString, getCurrentQuarterInfo } from '@/utils/quarterUtils';
import { calculateXpGain, getLevelFromXp } from '@/utils/xpCalculations';
import type { XpProgress, XpHistory, LevelReward, PlayerLevelReward, XpGainResult, QuarterInfo } from '@/types/xp';

export function useXpProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<XpProgress | null>(null);
  const [history, setHistory] = useState<XpHistory[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [unlockedRewards, setUnlockedRewards] = useState<PlayerLevelReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [quarterInfo, setQuarterInfo] = useState<QuarterInfo>(getCurrentQuarterInfo());

  const currentQuarter = getQuarterString();

  // Fetch all XP data
  const fetchXpData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch current progress, history, rewards, and unlocked rewards in parallel
      const [progressRes, historyRes, rewardsRes, unlockedRes] = await Promise.all([
        supabase
          .from('player_xp_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('quarter', currentQuarter)
          .maybeSingle(),
        supabase
          .from('player_xp_history')
          .select('*')
          .eq('user_id', user.id)
          .order('archived_at', { ascending: false }),
        supabase
          .from('level_rewards')
          .select('*')
          .order('level_required', { ascending: true }),
        supabase
          .from('player_level_rewards')
          .select('*, reward:level_rewards(*)')
          .eq('user_id', user.id),
      ]);

      if (progressRes.error) throw progressRes.error;
      if (historyRes.error) throw historyRes.error;
      if (rewardsRes.error) throw rewardsRes.error;
      if (unlockedRes.error) throw unlockedRes.error;

      setProgress(progressRes.data as XpProgress | null);
      setHistory(historyRes.data as XpHistory[]);
      setRewards(rewardsRes.data as LevelReward[]);
      setUnlockedRewards(unlockedRes.data as PlayerLevelReward[]);
    } catch (error) {
      console.error('Error fetching XP data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentQuarter]);

  useEffect(() => {
    fetchXpData();
  }, [fetchXpData]);

  // Update quarter info every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setQuarterInfo(getCurrentQuarterInfo());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Initialize progress for current quarter if it doesn't exist
   */
  const initializeProgress = useCallback(async (): Promise<XpProgress | null> => {
    if (!user) return null;

    // Check if already exists
    const { data: existing } = await supabase
      .from('player_xp_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('quarter', currentQuarter)
      .maybeSingle();

    if (existing) {
      setProgress(existing as XpProgress);
      return existing as XpProgress;
    }

    // Create new progress record
    const { data: newProgress, error } = await supabase
      .from('player_xp_progress')
      .insert({
        user_id: user.id,
        quarter: currentQuarter,
        current_xp: 0,
        current_level: 1,
        peak_level: 1,
        games_logged: 0,
        total_performance_score: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error initializing XP progress:', error);
      return null;
    }

    setProgress(newProgress as XpProgress);
    return newProgress as XpProgress;
  }, [user, currentQuarter]);

  /**
   * Add XP and handle level ups
   */
  const addXp = useCallback(async (
    xpAmount: number,
    performanceScore: number,
    recoveryBonus: number = 0,
    streakBonus: number = 0,
    streakCount: number = 0
  ): Promise<XpGainResult | null> => {
    if (!user) return null;

    // Ensure progress exists
    let currentProgress = progress;
    if (!currentProgress) {
      currentProgress = await initializeProgress();
      if (!currentProgress) return null;
    }

    // Calculate the XP gain result (recoveryBonus + streakBonus added inside)
    const unlockedRewardIds = unlockedRewards.map(r => r.reward_id);
    const result = calculateXpGain(currentProgress, xpAmount, rewards, unlockedRewardIds, recoveryBonus, streakBonus, streakCount);

    // Update progress in database
    const newPeakLevel = Math.max(currentProgress.peak_level, result.newLevel);
    const { data: updatedProgress, error: updateError } = await supabase
      .from('player_xp_progress')
      .update({
        current_xp: result.newXp,
        current_level: result.newLevel,
        peak_level: newPeakLevel,
        games_logged: currentProgress.games_logged + 1,
        total_performance_score: currentProgress.total_performance_score + performanceScore,
      })
      .eq('id', currentProgress.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating XP progress:', updateError);
      return null;
    }

    setProgress(updatedProgress as XpProgress);

    // Unlock new rewards if any
    if (result.newRewards.length > 0) {
      const rewardInserts = result.newRewards.map(reward => ({
        user_id: user.id,
        reward_id: reward.id,
        unlocked_quarter: currentQuarter,
      }));

      const { data: newUnlocked, error: rewardError } = await supabase
        .from('player_level_rewards')
        .insert(rewardInserts)
        .select('*, reward:level_rewards(*)');

      if (rewardError) {
        console.error('Error unlocking rewards:', rewardError);
      } else if (newUnlocked) {
        setUnlockedRewards(prev => [...prev, ...(newUnlocked as PlayerLevelReward[])]);
      }
    }

    return result;
  }, [user, progress, rewards, unlockedRewards, currentQuarter, initializeProgress]);

  /**
   * Remove XP (when a game is deleted)
   * Recalculates level and removes rewards that are no longer valid
   */
  const removeXp = useCallback(async (
    xpAmount: number,
    performanceScore: number
  ): Promise<boolean> => {
    if (!user || !progress) return false;

    const newXp = Math.max(0, progress.current_xp - xpAmount);
    const newLevel = Math.max(1, getLevelFromXp(newXp));
    const newGamesLogged = Math.max(0, progress.games_logged - 1);
    const newTotalPerformance = Math.max(0, progress.total_performance_score - performanceScore);

    // Update progress in database
    const { error: updateError } = await supabase
      .from('player_xp_progress')
      .update({
        current_xp: newXp,
        current_level: newLevel,
        games_logged: newGamesLogged,
        total_performance_score: newTotalPerformance,
      })
      .eq('id', progress.id);

    if (updateError) {
      console.error('Error removing XP:', updateError);
      return false;
    }

    // Remove rewards that are no longer valid (above new level)
    const rewardsToRemove = unlockedRewards.filter(ur => {
      const reward = rewards.find(r => r.id === ur.reward_id);
      return reward && reward.level_required > newLevel;
    });

    if (rewardsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('player_level_rewards')
        .delete()
        .in('id', rewardsToRemove.map(r => r.id));

      if (deleteError) {
        console.error('Error removing level rewards:', deleteError);
      }
    }

    // Refresh data
    await fetchXpData();
    return true;
  }, [user, progress, rewards, unlockedRewards, fetchXpData]);

  /**
   * Get career peak level across all quarters
   */
  const getCareerPeakLevel = useCallback((): number => {
    const currentPeak = progress?.peak_level ?? 1;
    const historyPeak = history.reduce((max, h) => Math.max(max, h.final_level), 0);
    return Math.max(currentPeak, historyPeak);
  }, [progress, history]);

  /**
   * Get rewards available at current level
   */
  const getAvailableRewards = useCallback((): LevelReward[] => {
    const currentLevel = progress?.current_level ?? 1;
    return rewards.filter(r => r.level_required <= currentLevel);
  }, [progress, rewards]);

  /**
   * Get next reward to unlock
   */
  const getNextReward = useCallback((): LevelReward | null => {
    const currentLevel = progress?.current_level ?? 1;
    const unlockedIds = unlockedRewards.map(r => r.reward_id);
    return rewards.find(r => r.level_required > currentLevel && !unlockedIds.includes(r.id)) ?? null;
  }, [progress, rewards, unlockedRewards]);

  /**
   * Check if a reward is unlocked
   */
  const isRewardUnlocked = useCallback((rewardId: string): boolean => {
    return unlockedRewards.some(r => r.reward_id === rewardId);
  }, [unlockedRewards]);

  return {
    progress,
    history,
    rewards,
    unlockedRewards,
    loading,
    quarterInfo,
    currentQuarter,
    addXp,
    removeXp,
    initializeProgress,
    getCareerPeakLevel,
    getAvailableRewards,
    getNextReward,
    isRewardUnlocked,
    refreshXpData: fetchXpData,
  };
}
