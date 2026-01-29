import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  MilestoneDefinition, 
  PlayerMilestone, 
  MilestoneCategory,
  NewMilestoneResult 
} from '@/types/milestone';
import type { GameStats, SeasonStats } from '@/types/basketball';
import { 
  checkSingleGameMilestones, 
  checkMultiGameMilestones, 
  checkSeasonMilestones 
} from '@/utils/milestoneChecker';

interface GameWithId extends GameStats {
  id: string;
}

export function useMilestones(seasonId?: string) {
  const { user } = useAuth();
  const [definitions, setDefinitions] = useState<MilestoneDefinition[]>([]);
  const [earnedMilestones, setEarnedMilestones] = useState<PlayerMilestone[]>([]);
  const [unviewedMilestones, setUnviewedMilestones] = useState<PlayerMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch milestone definitions
  const fetchDefinitions = useCallback(async () => {
    const { data, error } = await supabase
      .from('milestone_definitions')
      .select('*');

    if (error) {
      console.error('Error fetching milestone definitions:', error);
      return [];
    }

    const mapped: MilestoneDefinition[] = (data || []).map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category as MilestoneCategory,
      rarity: d.rarity as any,
      icon: d.icon,
      checkType: d.check_type,
      threshold: d.threshold,
      secondaryThreshold: d.secondary_threshold || undefined,
    }));

    setDefinitions(mapped);
    return mapped;
  }, []);

  // Fetch user's earned milestones
  const fetchEarnedMilestones = useCallback(async () => {
    if (!user) return [];

    let query = supabase
      .from('player_milestones')
      .select(`
        *,
        milestone_definitions (*)
      `)
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching earned milestones:', error);
      return [];
    }

    const mapped: PlayerMilestone[] = (data || []).map(pm => ({
      id: pm.id,
      milestoneId: pm.milestone_id,
      milestone: pm.milestone_definitions ? {
        id: pm.milestone_definitions.id,
        name: pm.milestone_definitions.name,
        description: pm.milestone_definitions.description,
        category: pm.milestone_definitions.category as MilestoneCategory,
        rarity: pm.milestone_definitions.rarity as any,
        icon: pm.milestone_definitions.icon,
        checkType: pm.milestone_definitions.check_type,
        threshold: pm.milestone_definitions.threshold,
        secondaryThreshold: pm.milestone_definitions.secondary_threshold || undefined,
      } : undefined,
      seasonId: pm.season_id || undefined,
      gameId: pm.game_id || undefined,
      earnedAt: pm.earned_at,
      statsSnapshot: pm.stats_snapshot as any,
      isViewed: pm.is_viewed,
    }));

    setEarnedMilestones(mapped);
    setUnviewedMilestones(mapped.filter(m => !m.isViewed));
    return mapped;
  }, [user, seasonId]);

  // Check and award milestones after a game is logged
  const checkAndAwardMilestones = useCallback(async (
    newGame: GameWithId,
    allGames: GameWithId[],
    seasonStats: SeasonStats,
    currentSeasonId?: string
  ): Promise<NewMilestoneResult[]> => {
    if (!user) return [];

    const defs = definitions.length > 0 ? definitions : await fetchDefinitions();
    const earned = earnedMilestones.length > 0 ? earnedMilestones : await fetchEarnedMilestones();
    const earnedIds = new Set(earned.map(e => e.milestoneId));

    // Check all milestone types
    const singleGameResults = checkSingleGameMilestones(newGame, defs, earnedIds);
    const multiGameResults = checkMultiGameMilestones(allGames, defs, earnedIds);
    const seasonResults = checkSeasonMilestones(seasonStats, allGames, defs, earnedIds);

    const allResults = [...singleGameResults, ...multiGameResults, ...seasonResults];

    // Save new milestones to database
    if (allResults.length > 0) {
      const inserts = allResults.map(r => ({
        user_id: user.id,
        milestone_id: r.milestone.id,
        season_id: currentSeasonId || null,
        game_id: r.gameId || null,
        stats_snapshot: JSON.parse(JSON.stringify(r.statsSnapshot)),
        is_viewed: false,
      }));

      const { error } = await supabase
        .from('player_milestones')
        .insert(inserts)
        .select();

      if (error) {
        console.error('Error saving milestones:', error);
      } else {
        // Refresh earned milestones
        await fetchEarnedMilestones();
      }
    }

    return allResults;
  }, [user, definitions, earnedMilestones, fetchDefinitions, fetchEarnedMilestones]);

  // Mark milestones as viewed
  const markAsViewed = useCallback(async (milestoneIds: string[]) => {
    if (!user || milestoneIds.length === 0) return;

    const { error } = await supabase
      .from('player_milestones')
      .update({ is_viewed: true })
      .in('id', milestoneIds);

    if (error) {
      console.error('Error marking milestones as viewed:', error);
      return;
    }

    setEarnedMilestones(prev => 
      prev.map(m => milestoneIds.includes(m.id) ? { ...m, isViewed: true } : m)
    );
    setUnviewedMilestones(prev => prev.filter(m => !milestoneIds.includes(m.id)));
  }, [user]);

  // Get progress for season cumulative milestones
  const getSeasonProgress = useCallback((games: GameWithId[]) => {
    const totals = games.reduce((acc, g) => ({
      points: acc.points + g.points,
      rebounds: acc.rebounds + g.rebounds,
      assists: acc.assists + g.assists,
      steals: acc.steals + g.steals,
      blocks: acc.blocks + g.blocks,
      threes: acc.threes + g.threePtMade,
    }), { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, threes: 0 });

    const seasonDefs = definitions.filter(d => d.category === 'season');
    const earnedIds = new Set(earnedMilestones.map(e => e.milestoneId));

    return seasonDefs.map(def => {
      let current = 0;
      switch (def.checkType) {
        case 'season_points':
          current = totals.points;
          break;
        case 'season_rebounds':
          current = totals.rebounds;
          break;
        case 'season_assists':
          current = totals.assists;
          break;
        case 'season_steals':
          current = totals.steals;
          break;
        case 'season_blocks':
          current = totals.blocks;
          break;
        case 'season_threes':
          current = totals.threes;
          break;
      }

      return {
        milestone: def,
        current,
        target: def.threshold,
        progress: Math.min((current / def.threshold) * 100, 100),
        isEarned: earnedIds.has(def.id),
      };
    });
  }, [definitions, earnedMilestones]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDefinitions(), fetchEarnedMilestones()]);
      setLoading(false);
    };
    init();
  }, [fetchDefinitions, fetchEarnedMilestones]);

  return {
    definitions,
    earnedMilestones,
    unviewedMilestones,
    loading,
    checkAndAwardMilestones,
    markAsViewed,
    getSeasonProgress,
    refreshMilestones: fetchEarnedMilestones,
  };
}
