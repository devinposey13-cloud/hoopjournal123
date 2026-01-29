import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TradingCard, EarnedBadge, GenerateCardRequest, CardRarity, StatsSnapshot } from '@/types/tradingCard';
import { toast } from 'sonner';

export function useTradingCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<TradingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trading_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse JSONB fields with proper type casting
      const parsedCards: TradingCard[] = (data || []).map(card => ({
        ...card,
        rarity: card.rarity as CardRarity,
        stats_snapshot: card.stats_snapshot as unknown as StatsSnapshot,
        badges_earned: (card.badges_earned as unknown as EarnedBadge[]) || [],
      }));
      
      setCards(parsedCards);
    } catch (error) {
      console.error('Error fetching trading cards:', error);
      toast.error('Failed to load trading cards');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateCard = useCallback(async (request: GenerateCardRequest): Promise<TradingCard | null> => {
    if (!user) {
      toast.error('You must be logged in to generate a card');
      return null;
    }

    if (request.seasonStats.gamesPlayed < 3) {
      toast.error('You need at least 3 games played to generate a trading card');
      return null;
    }

    setGenerating(true);
    try {
      // Call edge function to generate card data
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'generate-trading-card',
        {
          body: {
            seasonStats: request.seasonStats,
            profile: request.profile,
            seasonId: request.seasonId,
          },
        }
      );

      if (functionError) throw functionError;
      
      const { card: cardData, badges } = functionData;

      // Insert the card into the database
      const { data: insertedCard, error: insertError } = await supabase
        .from('trading_cards')
        .insert({
          user_id: user.id,
          season_id: cardData.season_id,
          rarity: cardData.rarity,
          overall_rating: cardData.overall_rating,
          offense_rating: cardData.offense_rating,
          defense_rating: cardData.defense_rating,
          playmaking_rating: cardData.playmaking_rating,
          athleticism_rating: cardData.athleticism_rating,
          iq_rating: cardData.iq_rating,
          player_title: cardData.player_title,
          scouting_report: cardData.scouting_report,
          stats_snapshot: cardData.stats_snapshot,
          badges_earned: cardData.badges_earned,
          games_played: cardData.games_played,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Save badges to player_badges table
      if (badges && badges.length > 0) {
        const badgeInserts = badges.map((badge: EarnedBadge) => ({
          user_id: user.id,
          badge_name: badge.name,
          badge_category: badge.category,
          tier: badge.tier,
          season_id: request.seasonId || null,
        }));

        // Use upsert to handle existing badges
        await supabase
          .from('player_badges')
          .upsert(badgeInserts, { 
            onConflict: 'user_id,badge_name,season_id',
            ignoreDuplicates: false 
          });
      }

      const newCard: TradingCard = {
        ...insertedCard,
        rarity: insertedCard.rarity as CardRarity,
        stats_snapshot: insertedCard.stats_snapshot as unknown as StatsSnapshot,
        badges_earned: (insertedCard.badges_earned as unknown as EarnedBadge[]) || [],
      };

      setCards(prev => [newCard, ...prev]);
      toast.success(`${cardData.rarity.toUpperCase()} card generated!`);
      
      return newCard;
    } catch (error) {
      console.error('Error generating trading card:', error);
      toast.error('Failed to generate trading card');
      return null;
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const deleteCard = useCallback(async (cardId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trading_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCards(prev => prev.filter(c => c.id !== cardId));
      toast.success('Card deleted');
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  }, [user]);

  return {
    cards,
    loading,
    generating,
    fetchCards,
    generateCard,
    deleteCard,
  };
}
