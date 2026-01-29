import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTradingCards } from '@/hooks/useTradingCards';
import { useCloudData } from '@/hooks/useCloudData';
import { TradingCard, TradingCardMini } from './TradingCard';
import type { TradingCard as TradingCardType } from '@/types/tradingCard';
import { cn } from '@/lib/utils';

export function CardCollection() {
  const { cards, loading, generating, fetchCards, generateCard } = useTradingCards();
  const { profile, seasonStats, activeSeason } = useCloudData();
  const [selectedCard, setSelectedCard] = useState<TradingCardType | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCard, setNewCard] = useState<TradingCardType | null>(null);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleGenerateCard = async () => {
    if (!profile || !seasonStats) return;

    const card = await generateCard({
      seasonStats: {
        avgPoints: seasonStats.avgPoints,
        avgRebounds: seasonStats.avgRebounds,
        avgAssists: seasonStats.avgAssists,
        avgSteals: seasonStats.avgSteals,
        avgBlocks: seasonStats.avgBlocks,
        fgPercentage: seasonStats.fgPercentage,
        threePtPercentage: seasonStats.threePtPercentage,
        ftPercentage: seasonStats.ftPercentage,
        gamesPlayed: seasonStats.gamesPlayed,
        wins: seasonStats.wins,
        losses: seasonStats.losses,
      },
      profile: {
        name: profile.name,
        team: profile.team,
        position: profile.position,
        number: profile.number,
        grade: profile.grade,
        avatar_url: profile.avatar,
      },
      seasonId: activeSeason?.id,
    });

    if (card) {
      setNewCard(card);
      setShowNewCard(true);
    }
  };

  const canGenerateCard = profile && seasonStats && seasonStats.gamesPlayed >= 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            My Trading Cards
          </h2>
          <p className="text-sm text-muted-foreground">
            Collect unique cards based on your performance
          </p>
        </div>
        <Button
          onClick={handleGenerateCard}
          disabled={generating || !canGenerateCard}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Card
            </>
          )}
        </Button>
      </div>

      {/* Requirements notice */}
      {!canGenerateCard && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          {!profile ? (
            'Set up your profile to generate trading cards.'
          ) : seasonStats && seasonStats.gamesPlayed < 3 ? (
            `You need at least 3 games to generate a card. (${seasonStats.gamesPlayed}/3 games played)`
          ) : (
            'Log some games to unlock trading cards!'
          )}
        </div>
      )}

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No trading cards yet.</p>
          <p className="text-sm">Generate your first card based on your stats!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <TradingCardMini
              key={card.id}
              card={card}
              playerName={profile?.name || 'Player'}
              avatarUrl={profile?.avatar}
              onClick={() => setSelectedCard(card)}
            />
          ))}
        </div>
      )}

      {/* Card Detail Modal */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-fit bg-transparent border-none shadow-none">
          {selectedCard && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 z-10 bg-background/80 rounded-full"
                onClick={() => setSelectedCard(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <TradingCard
                card={selectedCard}
                playerName={profile?.name || 'Player'}
                playerTeam={profile?.team || 'Team'}
                playerPosition={profile?.position || 'Guard'}
                playerNumber={profile?.number || 0}
                playerGrade={profile?.grade || ''}
                avatarUrl={profile?.avatar}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Card Reveal Modal */}
      <Dialog open={showNewCard} onOpenChange={setShowNewCard}>
        <DialogContent className="max-w-fit bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>New Card Generated</DialogTitle>
          </DialogHeader>
          {newCard && (
            <div className="relative animate-in zoom-in-95 duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-purple-500/20 blur-3xl -z-10" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 z-10 bg-background/80 rounded-full"
                onClick={() => {
                  setShowNewCard(false);
                  setNewCard(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <TradingCard
                card={newCard}
                playerName={profile?.name || 'Player'}
                playerTeam={profile?.team || 'Team'}
                playerPosition={profile?.position || 'Guard'}
                playerNumber={profile?.number || 0}
                playerGrade={profile?.grade || ''}
                avatarUrl={profile?.avatar}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
