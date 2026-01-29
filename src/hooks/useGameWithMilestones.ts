import { useState, useCallback } from 'react';
import { useCloudData } from './useCloudData';
import { useMilestones } from './useMilestones';
import type { GameStats, SeasonStats } from '@/types/basketball';
import type { NewMilestoneResult } from '@/types/milestone';

interface GameWithId extends GameStats {
  id: string;
}

export function useGameWithMilestones() {
  const cloudData = useCloudData();
  const { 
    checkAndAwardMilestones, 
    unviewedMilestones, 
    markAsViewed,
    earnedMilestones,
    definitions,
    getSeasonProgress,
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

    // Check for milestones
    const newMilestones = await checkAndAwardMilestones(
      { ...savedGame, id: savedGame.id },
      allGames,
      cloudData.seasonStats,
      cloudData.activeSeason?.id
    );

    // If milestones were earned, show the reveal
    if (newMilestones.length > 0) {
      setPendingMilestones(newMilestones);
      setShowReveal(true);
    }

    return savedGame;
  }, [cloudData, checkAndAwardMilestones]);

  const closeReveal = useCallback(() => {
    setShowReveal(false);
    setPendingMilestones([]);
  }, []);

  const handleMilestoneViewed = useCallback(async (milestoneIds: string[]) => {
    await markAsViewed(milestoneIds);
  }, [markAsViewed]);

  return {
    // Spread all cloudData properties
    ...cloudData,
    // Override addGame with milestone-aware version
    addGame: addGameWithMilestones,
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
    refreshMilestones,
  };
}
