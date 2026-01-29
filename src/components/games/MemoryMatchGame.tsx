import { useState, useEffect } from 'react';
import { ArrowLeft, Brain, Timer, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';
import type { MemoryCard } from '@/types/games';

interface MemoryMatchGameProps {
  onBack: () => void;
}

type GridSize = '4x4' | '6x6' | '8x8';

const ICONS = ['🏀', '⛹️', '🏆', '👟', '🎯', '💪', '🔥', '⭐', '🏅', '🎽', '📊', '🏟️', '🥇', '🎮', '⏱️', '🏁', '💯', '🎪', '🌟', '🚀', '💫', '🎉', '👑', '💎', '🔔', '🎸', '🎹', '🎺', '🎻', '🎼', '🎤', '🎬'];

export function MemoryMatchGame({ onBack }: MemoryMatchGameProps) {
  const [gridSize, setGridSize] = useState<GridSize>('4x4');
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const { saveGameResult, userStats } = useGameData();
  const { checkAndUnlockAchievements } = useAchievements();
  const { playSound } = useSoundEffects();

  const getGridDimensions = (size: GridSize): number => {
    const dims = { '4x4': 4, '6x6': 6, '8x8': 8 };
    return dims[size];
  };

  const totalPairs = (getGridDimensions(gridSize) ** 2) / 2;

  const initializeGame = (size: GridSize) => {
    const dim = getGridDimensions(size);
    const numPairs = (dim * dim) / 2;
    const selectedIcons = ICONS.slice(0, numPairs);
    
    const cardPairs = [...selectedIcons, ...selectedIcons];
    const shuffled = cardPairs
      .sort(() => Math.random() - 0.5)
      .map((icon, index) => ({
        id: index,
        icon,
        isFlipped: false,
        isMatched: false,
      }));
    
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setTimeElapsed(0);
    setGameStarted(true);
    setGameComplete(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameStarted && !gameComplete) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [gameStarted, gameComplete]);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    if (cards[cardId].isMatched || flippedCards.includes(cardId)) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, isFlipped: true } : card
      )
    );

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      
      const [first, second] = newFlipped;
      
      if (cards[first].icon === cards[second].icon) {
        // Match found
        playSound('make');
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === first || card.id === second
                ? { ...card, isMatched: true }
                : card
            )
          );
          setMatchedPairs((prev) => prev + 1);
          setFlippedCards([]);
        }, 500);
      } else {
        // No match
        playSound('block');
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === first || card.id === second
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (matchedPairs === totalPairs && gameStarted) {
      setGameComplete(true);
      setShowResults(true);
    }
  }, [matchedPairs, totalPairs, gameStarted]);

  const calculateScore = (): number => {
    const baseScore = 100;
    const timeBonus = Math.max(0, 300 - timeElapsed);
    const moveBonus = Math.max(0, (totalPairs * 3 - moves) * 5);
    const sizeMultiplier = gridSize === '8x8' ? 3 : gridSize === '6x6' ? 2 : 1;
    
    return Math.floor((baseScore + timeBonus + moveBonus) * sizeMultiplier);
  };

  const handleGameComplete = async () => {
    const result = {
      game_type: 'memory_match' as const,
      score: calculateScore(),
      metadata: {
        grid_size: gridSize,
        moves,
        time_seconds: timeElapsed,
        pairs_matched: matchedPairs,
      },
    };
    
    await saveGameResult(result);
    await checkAndUnlockAchievements(result, {
      games_played: userStats?.games_played || 0,
      current_streak: userStats?.current_streak || 0,
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    return (
      <GameResults
        gameType="memory_match"
        score={calculateScore()}
        metadata={{
          grid_size: gridSize,
          moves,
          time_seconds: timeElapsed,
        }}
        onPlayAgain={() => {
          setShowResults(false);
          initializeGame(gridSize);
        }}
        onBack={onBack}
        onComplete={handleGameComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {gameStarted && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Moves</p>
              <p className="text-lg font-bold">{moves}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pairs</p>
              <p className="text-lg font-bold">{matchedPairs}/{totalPairs}</p>
            </div>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Memory Match
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!gameStarted ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Select Difficulty</h3>
                <p className="text-muted-foreground">
                  Larger grids are harder but score more points!
                </p>
              </div>
              
              <div className="flex justify-center gap-4">
                {(['4x4', '6x6', '8x8'] as GridSize[]).map((size) => (
                  <Button
                    key={size}
                    variant={gridSize === size ? 'default' : 'outline'}
                    onClick={() => setGridSize(size)}
                    className="w-20 h-20 text-lg"
                  >
                    {size}
                  </Button>
                ))}
              </div>
              
              <Button
                size="lg"
                onClick={() => initializeGame(gridSize)}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Start Game
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={cn(
                  'grid gap-2 mx-auto',
                  gridSize === '4x4' && 'grid-cols-4 max-w-xs',
                  gridSize === '6x6' && 'grid-cols-6 max-w-md',
                  gridSize === '8x8' && 'grid-cols-8 max-w-lg'
                )}
              >
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={card.isMatched || flippedCards.length === 2}
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center text-2xl transition-all duration-300 transform',
                      gridSize === '8x8' && 'text-lg',
                      card.isFlipped || card.isMatched
                        ? 'bg-primary/10 rotate-0'
                        : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-105',
                      card.isMatched && 'opacity-50'
                    )}
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {card.isFlipped || card.isMatched ? card.icon : '?'}
                  </button>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => initializeGame(gridSize)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
