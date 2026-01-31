import { useState, useCallback } from 'react';
import { useCloudData } from './useCloudData';
import { useMilestones } from './useMilestones';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { findInvalidMilestones } from '@/utils/milestoneValidator';
import type { GameStats } from '@/types/basketball';
import type { NewMilestoneResult } from '@/types/milestone';
import { toast } from 'sonner';

interface GameWithId extends GameStats {
  id: string;
  seasonId?: string;
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
  
  const [pendingMilestones, setPendingMilestones] = useState<NewMilestoneResult[]>([]);
  const [showReveal, setShowReveal] = useState(false);

  const addGameWithMilestones = useCallback(async (game: Omit<GameStats, 'id'>) => {
    // First, save the game using the original addGame
    const savedGame = await cloudData.addGame(game);
    
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
    }

    return savedGame;
  }, [cloudData, checkAndAwardMilestones, getOccurrenceCount]);

  const closeReveal = useCallback(() => {
    setShowReveal(false);
    setPendingMilestones([]);
  }, []);

  const handleMilestoneViewed = useCallback(async (milestoneIds: string[]) => {
    await markAsViewed(milestoneIds);
  }, [markAsViewed]);

  /**
   * Delete a game with milestone cleanup
   * 1. Deletes milestones linked directly to this game
   * 2. Deletes the game from the database
   * 3. Re-evaluates multi-game and season milestones
   * 4. Removes any milestones that are no longer valid
   * 5. Refreshes milestone state so UI updates immediately
   */
  const deleteGameWithMilestones = useCallback(async (gameId: string) => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Error in deleteGameWithMilestones:', error);
      toast.error('Failed to delete game');
    }
  }, [user, cloudData, definitions, earnedMilestones, refreshMilestones]);

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
  };
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
