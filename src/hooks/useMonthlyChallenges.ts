import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { GameStats } from '@/types/basketball';

export interface MonthlyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  checkType: string;
  threshold: number;
  secondaryThreshold?: number;
  month: string;
  rewardPoints: number;
  difficulty: 'easy' | 'medium' | 'hard';
  themeName?: string;
}

export interface ChallengeProgress {
  id: string;
  challengeId: string;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ChallengeWithProgress extends MonthlyChallenge {
  progress: number;
  currentValue: number;
  isCompleted: boolean;
}

export function useMonthlyChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<MonthlyChallenge[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current month in format "YYYY-MM"
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Get days remaining in month
  const daysRemaining = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
  }, []);

  // Get theme name from active challenges
  const themeName = useMemo(() => {
    return challenges.length > 0 ? challenges[0].themeName : undefined;
  }, [challenges]);

  // Fetch active challenges
  const fetchChallenges = useCallback(async () => {
    const { data, error } = await supabase
      .from('monthly_challenges')
      .select('*')
      .eq('is_active', true)
      .order('difficulty');

    if (error) {
      console.error('Error fetching monthly challenges:', error);
      return [];
    }

    const mapped: MonthlyChallenge[] = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      checkType: c.check_type,
      threshold: c.threshold,
      secondaryThreshold: c.secondary_threshold || undefined,
      month: c.month,
      rewardPoints: c.reward_points,
      difficulty: c.difficulty as 'easy' | 'medium' | 'hard',
      themeName: c.theme_name || undefined,
    }));

    setChallenges(mapped);
    return mapped;
  }, []);

  // Fetch user's progress on challenges
  const fetchProgress = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('challenge_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching challenge progress:', error);
      return [];
    }

    const mapped: ChallengeProgress[] = (data || []).map(p => ({
      id: p.id,
      challengeId: p.challenge_id,
      currentValue: p.current_value,
      isCompleted: p.is_completed,
      completedAt: p.completed_at || undefined,
    }));

    setProgress(mapped);
    return mapped;
  }, [user]);

  // Combine challenges with progress
  const challengesWithProgress = useMemo((): ChallengeWithProgress[] => {
    return challenges.map(challenge => {
      const userProgress = progress.find(p => p.challengeId === challenge.id);
      const currentValue = userProgress?.currentValue || 0;
      const progressPct = Math.min((currentValue / challenge.threshold) * 100, 100);

      return {
        ...challenge,
        progress: progressPct,
        currentValue,
        isCompleted: userProgress?.isCompleted || false,
      };
    });
  }, [challenges, progress]);

  // Calculate stats summary
  const stats = useMemo(() => {
    const completed = challengesWithProgress.filter(c => c.isCompleted).length;
    const total = challengesWithProgress.length;
    const totalPoints = challengesWithProgress
      .filter(c => c.isCompleted)
      .reduce((sum, c) => sum + c.rewardPoints, 0);

    return { completed, total, totalPoints };
  }, [challengesWithProgress]);

  // Update progress when a game is logged
  const updateProgressFromGame = useCallback(async (
    game: GameStats & { id: string },
    allGamesThisMonth: (GameStats & { id: string })[]
  ) => {
    if (!user) return;

    const activeChallenges = challenges.length > 0 ? challenges : await fetchChallenges();
    
    for (const challenge of activeChallenges) {
      let newValue = 0;

      switch (challenge.checkType) {
        case 'monthly_points':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.points, 0);
          break;
        case 'monthly_rebounds':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.rebounds, 0);
          break;
        case 'monthly_assists':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.assists, 0);
          break;
        case 'monthly_threes':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.threePtMade, 0);
          break;
        case 'monthly_steals':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.steals, 0);
          break;
        case 'monthly_blocks':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.blocks, 0);
          break;
        case 'monthly_wins':
          newValue = allGamesThisMonth.filter(g => g.isWin).length;
          break;
        case 'monthly_games':
          newValue = allGamesThisMonth.length;
          break;
        case 'monthly_defensive':
          newValue = allGamesThisMonth.reduce((sum, g) => sum + g.steals + g.blocks, 0);
          break;
        case 'zero_turnovers':
          newValue = allGamesThisMonth.some(g => g.turnovers === 0) ? 1 : 0;
          break;
        case 'win_streak': {
          // Check for consecutive wins at the end of the month's games
          let streak = 0;
          const sortedGames = [...allGamesThisMonth].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          for (const g of sortedGames) {
            if (g.isWin) streak++;
            else break;
          }
          newValue = streak;
          break;
        }
        case 'monthly_fg_pct': {
          const totalFGM = allGamesThisMonth.reduce((sum, g) => sum + g.fgMade, 0);
          const totalFGA = allGamesThisMonth.reduce((sum, g) => sum + g.fgAttempted, 0);
          if (totalFGA >= 20) {
            newValue = Math.round((totalFGM / totalFGA) * 100);
          }
          break;
        }
        case 'monthly_avg_assists': {
          if (allGamesThisMonth.length >= 3) {
            const avgAst = allGamesThisMonth.reduce((sum, g) => sum + g.assists, 0) / allGamesThisMonth.length;
            newValue = Math.round(avgAst * 10) / 10; // Round to 1 decimal
          }
          break;
        }
        case 'monthly_efficient_points': {
          const totalFGM = allGamesThisMonth.reduce((sum, g) => sum + g.fgMade, 0);
          const totalFGA = allGamesThisMonth.reduce((sum, g) => sum + g.fgAttempted, 0);
          const totalPts = allGamesThisMonth.reduce((sum, g) => sum + g.points, 0);
          if (totalFGA > 0 && (totalFGM / totalFGA) >= 0.5) {
            newValue = totalPts;
          }
          break;
        }
        case 'games_with_threshold': {
          // Count games where player scored 10+ points
          newValue = allGamesThisMonth.filter(g => g.points >= 10).length;
          break;
        }
        default:
          continue;
      }

      const isCompleted = newValue >= challenge.threshold;

      // Upsert progress
      const { error } = await supabase
        .from('challenge_progress')
        .upsert({
          user_id: user.id,
          challenge_id: challenge.id,
          current_value: newValue,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,challenge_id',
        });

      if (error) {
        console.error('Error updating challenge progress:', error);
      }
    }

    // Refresh progress after updates
    await fetchProgress();
  }, [user, challenges, fetchChallenges, fetchProgress]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchChallenges(), fetchProgress()]);
      setLoading(false);
    };
    init();
  }, [fetchChallenges, fetchProgress]);

  return {
    challenges: challengesWithProgress,
    loading,
    daysRemaining,
    currentMonth,
    themeName,
    stats,
    updateProgressFromGame,
    refreshChallenges: fetchChallenges,
    refreshProgress: fetchProgress,
  };
}
