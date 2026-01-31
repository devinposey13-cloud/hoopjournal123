import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getQuarterString } from '@/utils/quarterUtils';
import { calculatePerformance } from '@/utils/performanceScoring';
import { getLevelFromXp } from '@/utils/xpCalculations';
import type { GameStats } from '@/types/basketball';

const RETROACTIVE_XP_KEY = 'hoop_journal_retroactive_xp_applied';

/**
 * Hook to apply retroactive XP for games logged before the XP system was created.
 * Runs once per user on initial load.
 */
export function useRetroactiveXp() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  const applyRetroactiveXp = useCallback(async () => {
    if (!user) return;

    // Check if already applied for this user
    const appliedKey = `${RETROACTIVE_XP_KEY}_${user.id}`;
    if (localStorage.getItem(appliedKey)) {
      return;
    }

    try {
      // Check if user already has XP progress
      const { data: existingProgress } = await supabase
        .from('player_xp_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If user has XP and games logged, they've already been using the system
      if (existingProgress && existingProgress.games_logged > 0) {
        localStorage.setItem(appliedKey, 'true');
        return;
      }

      // Fetch all games for the user
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (gamesError) {
        console.error('Error fetching games for retroactive XP:', gamesError);
        return;
      }

      if (!games || games.length === 0) {
        // No games to process
        localStorage.setItem(appliedKey, 'true');
        return;
      }

      console.log(`Applying retroactive XP for ${games.length} games...`);

      // Calculate total XP and performance for all games
      let totalXp = 0;
      let totalPerformanceScore = 0;

      games.forEach(game => {
        const gameStats: GameStats = {
          id: game.id,
          date: game.date,
          opponent: game.opponent,
          points: game.points,
          rebounds: game.rebounds,
          assists: game.assists,
          steals: game.steals,
          blocks: game.blocks,
          turnovers: game.turnovers,
          fouls: game.fouls,
          minutesPlayed: game.minutes_played,
          fgMade: game.fg_made,
          fgAttempted: game.fg_attempted,
          threePtMade: game.three_pt_made,
          threePtAttempted: game.three_pt_attempted,
          ftMade: game.ft_made,
          ftAttempted: game.ft_attempted,
          isWin: game.is_win,
        };

        const performance = calculatePerformance(gameStats);
        totalXp += performance.xpEarned;
        totalPerformanceScore += performance.finalScore;
      });

      const currentQuarter = getQuarterString();
      const calculatedLevel = getLevelFromXp(totalXp);

      // Create or update XP progress
      if (existingProgress) {
        // Update existing progress
        const { error: updateError } = await supabase
          .from('player_xp_progress')
          .update({
            current_xp: totalXp,
            current_level: calculatedLevel,
            peak_level: calculatedLevel,
            games_logged: games.length,
            total_performance_score: totalPerformanceScore,
          })
          .eq('id', existingProgress.id);

        if (updateError) {
          console.error('Error updating XP progress:', updateError);
          return;
        }
      } else {
        // Create new progress
        const { error: insertError } = await supabase
          .from('player_xp_progress')
          .insert({
            user_id: user.id,
            quarter: currentQuarter,
            current_xp: totalXp,
            current_level: calculatedLevel,
            peak_level: calculatedLevel,
            games_logged: games.length,
            total_performance_score: totalPerformanceScore,
          });

        if (insertError) {
          console.error('Error creating XP progress:', insertError);
          return;
        }
      }

      console.log(`Retroactive XP applied: ${totalXp} XP, Level ${calculatedLevel}`);
      localStorage.setItem(appliedKey, 'true');
    } catch (error) {
      console.error('Error applying retroactive XP:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasRun.current) {
      hasRun.current = true;
      applyRetroactiveXp();
    }
  }, [user, applyRetroactiveXp]);
}
