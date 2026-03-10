import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveProfile } from './useActiveProfile';
import { generatePostGameInsight, type PostGameInsight, type InsightType } from '@/utils/postGameInsights';
import type { GameStats } from '@/types/basketball';

export interface StoredInsight {
  id: string;
  gameId: string;
  type: InsightType;
  title: string;
  body: string;
  statCallout: string | null;
  isSeen: boolean;
  createdAt: string;
}

/**
 * Hook for generating, persisting, and tracking post-game insights.
 * Uses the postgame_insights table with key_takeaways as JSON storage.
 */
export function usePostGameInsights(games: GameStats[]) {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const [insights, setInsights] = useState<StoredInsight[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch stored insights
  useEffect(() => {
    if (!user) return;

    const fetchInsights = async () => {
      const query = supabase
        .from('postgame_insights')
        .select('id, game_id, key_takeaways, feeling, mental_notes, created_at')
        .eq('user_id', user.id)
        .not('key_takeaways', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeProfile?.id) {
        query.eq('profile_id', activeProfile.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped: StoredInsight[] = data
          .filter(d => d.key_takeaways && Array.isArray(d.key_takeaways) && d.key_takeaways.length > 0)
          .map(d => {
            const payload = d.key_takeaways as any[];
            const insight = payload[0] || {};
            return {
              id: d.id,
              gameId: d.game_id,
              type: (insight.type || 'fallback') as InsightType,
              title: insight.title || 'Game Insight',
              body: insight.body || '',
              statCallout: insight.statCallout || null,
              isSeen: d.feeling === 'seen',
              createdAt: d.created_at,
            };
          });
        setInsights(mapped);
      }
      setLoading(false);
    };

    fetchInsights();
  }, [user, activeProfile?.id]);

  /**
   * Generate and store an insight for a newly logged game.
   */
  const generateAndStoreInsight = useCallback(async (
    game: GameStats,
    allGames: GameStats[],
    streakCount: number = 0
  ): Promise<PostGameInsight> => {
    if (!user) return generatePostGameInsight(game, allGames, streakCount);

    const insight = generatePostGameInsight(game, allGames, streakCount);

    // Store in postgame_insights using key_takeaways for the insight payload
    const { data, error } = await supabase
      .from('postgame_insights')
      .insert({
        game_id: game.id,
        user_id: user.id,
        profile_id: activeProfile?.id || null,
        season_id: null,
        key_takeaways: [
          {
            type: insight.type,
            title: insight.title,
            body: insight.body,
            statCallout: insight.statCallout,
          },
        ],
        feeling: 'unseen', // Use feeling column as seen/unseen flag
      })
      .select('id, created_at')
      .single();

    if (!error && data) {
      setInsights(prev => [
        {
          id: data.id,
          gameId: game.id,
          type: insight.type,
          title: insight.title,
          body: insight.body,
          statCallout: insight.statCallout || null,
          isSeen: false,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    }

    return insight;
  }, [user, activeProfile?.id]);

  /**
   * Mark an insight as seen.
   */
  const markInsightSeen = useCallback(async (insightId: string) => {
    setInsights(prev =>
      prev.map(i => (i.id === insightId ? { ...i, isSeen: true } : i))
    );

    await supabase
      .from('postgame_insights')
      .update({ feeling: 'seen' })
      .eq('id', insightId);
  }, []);

  /**
   * Get the insight for a specific game.
   */
  const getInsightForGame = useCallback(
    (gameId: string): StoredInsight | undefined => {
      return insights.find(i => i.gameId === gameId);
    },
    [insights]
  );

  /**
   * Get unseen insights count.
   */
  const unseenCount = useMemo(
    () => insights.filter(i => !i.isSeen).length,
    [insights]
  );

  /**
   * Get the latest unseen insight.
   */
  const latestUnseen = useMemo(
    () => insights.find(i => !i.isSeen) || null,
    [insights]
  );

  return {
    insights,
    loading,
    generateAndStoreInsight,
    markInsightSeen,
    getInsightForGame,
    unseenCount,
    latestUnseen,
  };
}
