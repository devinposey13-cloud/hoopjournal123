import { useState, useCallback } from 'react';
import { useCloudData } from './useCloudData';
import { useMilestones } from './useMilestones';
import { useXpProgress } from './useXpProgress';
import { useTierAchievements } from './useTierAchievements';
import { usePostGameInsights } from './usePostGameInsights';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { findInvalidMilestones } from '@/utils/milestoneValidator';
import { calculatePerformance } from '@/utils/performanceScoring';
import { calculateGameScore } from '@/utils/gameGrading';
import { isRecoveryEligible, XP_CONFIG, calculateConsistencyStreak, getStreakXpBonus } from '@/utils/xpCalculations';
import type { GameStats } from '@/types/basketball';
import type { NewMilestoneResult } from '@/types/milestone';
import type { PerformanceResult, XpGainResult, PerformanceTier } from '@/types/xp';
import type { PostGameInsight } from '@/utils/postGameInsights';
import { toast } from 'sonner';
import { dispatchSlackAlert } from '@/utils/slackAlerts';

interface GameWithId extends GameStats {
  id: string;
  seasonId?: string;
}

interface PendingTierCelebration {
  tier: PerformanceTier;
  performanceScore: number;
}

export function useGameWithMilestones() {
  const { user } = useAuth();
  const cloudData = useCloudData();
  const { 
    checkAndAwardMilestones, 
    unviewedMilestones, 
    markAsViewed,
    earnedMilestones,
    definitions,
    getSeasonProgress,
    getOccurrencesByMilestoneId,
    getOccurrenceCount,
    refreshMilestones,
  } = useMilestones(cloudData.activeSeason?.id);
  
  const xpProgress = useXpProgress();
  const tierAchievements = useTierAchievements();
  const insightsHook = usePostGameInsights(cloudData.games);
  
  const [pendingMilestones, setPendingMilestones] = useState<NewMilestoneResult[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  
  // XP reveal state
  const [pendingXpResult, setPendingXpResult] = useState<{
    performance: PerformanceResult;
    xpResult: XpGainResult;
  } | null>(null);
  const [showXpReveal, setShowXpReveal] = useState(false);
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState(false);
  
  // Tier celebration state
  const [pendingTierCelebration, setPendingTierCelebration] = useState<PendingTierCelebration | null>(null);
  const [showTierCelebration, setShowTierCelebration] = useState(false);
  const [pendingInsight, setPendingInsight] = useState<PostGameInsight | null>(null);

  const addGameWithMilestones = useCallback(async (game: Omit<GameStats, 'id'>) => {
    // Calculate and attach game score before saving
    const gameScore = calculateGameScore(game);
    const savedGame = await cloudData.addGame({ ...game, gameScore });
    
    if (!savedGame) {
      return null;
    }

    // Prepare all games including the new one for milestone checking
    const allGames: GameWithId[] = [savedGame, ...cloudData.games].map(g => ({
      ...g,
      id: g.id,
    }));

    // Check for milestones - now returns split result
    const { toReveal, silentlyRecorded } = await checkAndAwardMilestones(
      { ...savedGame, id: savedGame.id },
      allGames,
      cloudData.seasonStats,
      cloudData.activeSeason?.id
    );

    // Show toast for silently recorded milestones (repeat single-game achievements)
    if (silentlyRecorded.length > 0) {
      for (const result of silentlyRecorded) {
        const count = getOccurrenceCount(result.milestone.id);
        toast.success(
          `${result.milestone.name} achieved again! (${count}${getOrdinalSuffix(count)} time)`,
          { duration: 4000 }
        );
      }
    }

    // If new milestones were earned (first-time or streaks), show the reveal
    if (toReveal.length > 0) {
      setPendingMilestones(toReveal);
      setShowReveal(true);

      // Dispatch milestone Slack alert
      const milestoneNames = toReveal.map(m => m.milestone.name).join(', ');
      dispatchSlackAlert({
        category: 'milestone_alert',
        severity: 'info',
        title: 'Milestone Earned',
        summary: `${cloudData.profile?.name || 'A player'} earned: ${milestoneNames}`,
        details: {
          'Player': cloudData.profile?.name || 'Unknown',
          'Milestones': milestoneNames,
          'Game': savedGame.opponent,
        },
        dedup_key: `milestone_${savedGame.id}`,
      });
    }

    // Calculate performance and award XP
    const performance = calculatePerformance(savedGame);
    
    // Check for Recovery XP eligibility
    const recoveryBonus = isRecoveryEligible(savedGame.date, savedGame.scheduledGameId)
      ? XP_CONFIG.RECOVERY_BONUS_XP
      : 0;
    
    // Calculate consistency streak (including the new game)
    const { current: streakCount } = calculateConsistencyStreak(allGames, cloudData.schedule);
    const streakBonus = getStreakXpBonus(streakCount);

    // Dispatch high_engagement alert for 5+ game streaks
    if (streakCount >= 5) {
      dispatchSlackAlert({
        category: 'high_engagement',
        severity: 'info',
        title: 'High Engagement Streak',
        summary: `${cloudData.profile?.name || 'A player'} has a ${streakCount}-game consistency streak!`,
        details: {
          'Player': cloudData.profile?.name || 'Unknown',
          'Streak': `${streakCount} games`,
        },
        dedup_key: `streak_${user?.id}_${streakCount}`,
      });
    }
    
    const xpResult = await xpProgress.addXp(
      performance.xpEarned,
      performance.finalScore,
      recoveryBonus,
      streakBonus,
      streakCount
    );
    
    // Check for first-time tier achievement
    const isNewTier = !tierAchievements.hasTierBeenAchieved(performance.tier);
    if (isNewTier) {
      await tierAchievements.recordTierAchievement(
        performance.tier,
        performance.finalScore,
        savedGame.id
      );
      setPendingTierCelebration({
        tier: performance.tier,
        performanceScore: performance.finalScore,
      });
    }
    
    if (xpResult) {
      setPendingXpResult({ performance, xpResult });
      // Show XP reveal after milestone reveal closes (or immediately if no milestones)
      if (toReveal.length === 0 && !isNewTier) {
        setShowXpReveal(true);
      }
    }

    // Generate post-game insight
    const insight = await insightsHook.generateAndStoreInsight(savedGame, allGames, streakCount);
    setPendingInsight(insight);

    return savedGame;
  }, [cloudData, checkAndAwardMilestones, getOccurrenceCount, xpProgress, tierAchievements, insightsHook]);

  const closeReveal = useCallback(() => {
    setShowReveal(false);
    setPendingMilestones([]);
    // Chain: milestone reveal -> tier celebration -> XP reveal
    if (pendingTierCelebration) {
      setShowTierCelebration(true);
    } else if (pendingXpResult) {
      setShowXpReveal(true);
    }
  }, [pendingTierCelebration, pendingXpResult]);

  const closeTierCelebration = useCallback(() => {
    setShowTierCelebration(false);
    setPendingTierCelebration(null);
    // Continue chain to XP reveal
    if (pendingXpResult) {
      setShowXpReveal(true);
    }
  }, [pendingXpResult]);

  const closeXpReveal = useCallback(() => {
    setShowXpReveal(false);
    // If leveled up, show celebration
    if (pendingXpResult?.xpResult.didLevelUp) {
      setShowLevelUpCelebration(true);
    } else {
      setPendingXpResult(null);
    }
  }, [pendingXpResult]);

  const closeLevelUpCelebration = useCallback(() => {
    setShowLevelUpCelebration(false);
    setPendingXpResult(null);
  }, []);

  const handleMilestoneViewed = useCallback(async (milestoneIds: string[]) => {
    await markAsViewed(milestoneIds);
  }, [markAsViewed]);

  /**
   * Delete a game with milestone and XP cleanup
   * 1. Recalculates XP by removing the XP earned from this game
   * 2. Deletes milestones linked directly to this game
   * 3. Deletes the game from the database
   * 4. Re-evaluates multi-game and season milestones
   * 5. Removes any milestones that are no longer valid
   * 6. Refreshes milestone state so UI updates immediately
   */
  const deleteGameWithMilestones = useCallback(async (gameId: string) => {
    if (!user) return;

    try {
      // Find the game to get its stats for XP calculation
      const gameToDelete = cloudData.games.find(g => g.id === gameId);
      
      if (gameToDelete) {
        // Calculate the performance/XP that was earned from this game
        const performance = calculatePerformance(gameToDelete);
        
        // Remove XP from this game
        await xpProgress.removeXp(performance.xpEarned, performance.finalScore);
      }

      // 1. Delete milestones directly linked to this game (single-game milestones)
      const { error: deleteMilestonesError } = await supabase
        .from('player_milestones')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      if (deleteMilestonesError) {
        console.error('Error deleting game milestones:', deleteMilestonesError);
      }

      // 2. Delete the game using cloudData
      await cloudData.deleteGame(gameId);

      // 3. Get remaining games and re-evaluate multi-game/season milestones
      const remainingGames: GameWithId[] = cloudData.games
        .filter(g => g.id !== gameId)
        .map(g => ({
          ...g,
          seasonId: cloudData.activeSeason?.id,
        }));

      // 4. Find milestones that are no longer valid
      const invalidMilestoneIds = findInvalidMilestones(
        remainingGames,
        definitions,
        earnedMilestones,
        cloudData.activeSeason?.id
      );

      // 5. Remove invalidated milestones from database
      if (invalidMilestoneIds.length > 0) {
        const { error: deleteInvalidError } = await supabase
          .from('player_milestones')
          .delete()
          .in('id', invalidMilestoneIds)
          .eq('user_id', user.id);

        if (deleteInvalidError) {
          console.error('Error deleting invalid milestones:', deleteInvalidError);
        } else {
          toast.info(`${invalidMilestoneIds.length} milestone(s) no longer qualify and have been removed`);
        }
      }

      // 6. Refresh milestone state so UI updates
      await refreshMilestones();
      
      toast.success('Game deleted and XP adjusted');
    } catch (error) {
      console.error('Error in deleteGameWithMilestones:', error);
      toast.error('Failed to delete game');
    }
  }, [user, cloudData, definitions, earnedMilestones, refreshMilestones, xpProgress]);

  return {
    // Spread all cloudData properties
    ...cloudData,
    // Override addGame with milestone-aware version
    addGame: addGameWithMilestones,
    // Override deleteGame with milestone-aware version
    deleteGame: deleteGameWithMilestones,
    // Milestone-specific state
    pendingMilestones,
    showReveal,
    closeReveal,
    handleMilestoneViewed,
    // Milestone data
    unviewedMilestones,
    earnedMilestones,
    definitions,
    getSeasonProgress,
    getOccurrencesByMilestoneId,
    getOccurrenceCount,
    refreshMilestones,
    // XP system
    xpProgress: xpProgress.progress,
    xpQuarterInfo: xpProgress.quarterInfo,
    xpHistory: xpProgress.history,
    xpRewards: xpProgress.rewards,
    xpUnlockedRewards: xpProgress.unlockedRewards,
    pendingXpResult,
    showXpReveal,
    closeXpReveal,
    showLevelUpCelebration,
    closeLevelUpCelebration,
    // Tier celebration
    pendingTierCelebration,
    showTierCelebration,
    closeTierCelebration,
    achievedTiers: tierAchievements.achievedTiers,
    // Post-game insights
    pendingInsight,
    clearPendingInsight: () => setPendingInsight(null),
    insightsHook,
  };
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
