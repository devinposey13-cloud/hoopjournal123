import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { PerformanceTier } from '@/types/xp';

interface TierAchievement {
  id: string;
  tier: PerformanceTier;
  achieved_at: string;
  game_id: string | null;
  performance_score: number;
}

interface PendingTierCelebration {
  tier: PerformanceTier;
  performanceScore: number;
}

export function useTierAchievements() {
  const { user } = useAuth();
  const [achievedTiers, setAchievedTiers] = useState<TierAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCelebration, setPendingCelebration] = useState<PendingTierCelebration | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch existing tier achievements
  useEffect(() => {
    if (!user) {
      setAchievedTiers([]);
      setLoading(false);
      return;
    }

    async function fetchAchievements() {
      const { data, error } = await supabase
        .from('player_tier_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching tier achievements:', error);
      } else {
        setAchievedTiers(data as TierAchievement[]);
      }
      setLoading(false);
    }

    fetchAchievements();
  }, [user]);

  // Check if a tier has been achieved before
  const hasTierBeenAchieved = useCallback((tier: PerformanceTier): boolean => {
    return achievedTiers.some(a => a.tier === tier);
  }, [achievedTiers]);

  // Record a new tier achievement and trigger celebration
  const recordTierAchievement = useCallback(async (
    tier: PerformanceTier,
    performanceScore: number,
    gameId: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Check if already achieved
    if (hasTierBeenAchieved(tier)) {
      return false;
    }

    // Insert the new achievement
    const { data, error } = await supabase
      .from('player_tier_achievements')
      .insert({
        user_id: user.id,
        tier,
        performance_score: performanceScore,
        game_id: gameId,
      })
      .select()
      .single();

    if (error) {
      // Might be a duplicate key error if achieved in parallel
      if (error.code === '23505') {
        return false;
      }
      console.error('Error recording tier achievement:', error);
      return false;
    }

    // Update local state
    setAchievedTiers(prev => [...prev, data as TierAchievement]);

    // Set up celebration
    setPendingCelebration({ tier, performanceScore });
    setShowCelebration(true);

    return true;
  }, [user, hasTierBeenAchieved]);

  // Close celebration
  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
    setPendingCelebration(null);
  }, []);

  // Get all achieved tier names
  const getAchievedTierNames = useCallback((): PerformanceTier[] => {
    return achievedTiers.map(a => a.tier as PerformanceTier);
  }, [achievedTiers]);

  return {
    achievedTiers,
    loading,
    hasTierBeenAchieved,
    recordTierAchievement,
    getAchievedTierNames,
    pendingCelebration,
    showCelebration,
    closeCelebration,
  };
}
