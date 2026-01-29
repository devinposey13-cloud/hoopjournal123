import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

interface FreeThrowGameProps {
  onBack: () => void;
}

type GameState = 'ready' | 'playing' | 'shooting' | 'result' | 'finished';

export function FreeThrowGame({ onBack }: FreeThrowGameProps) {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [power, setPower] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastShot, setLastShot] = useState<'made' | 'missed' | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [showResults, setShowResults] = useState(false);
  
  const animationRef = useRef<number>();
  const speedRef = useRef(2);
  
  const { saveGameResult, userStats } = useGameData();
  const { checkAndUnlockAchievements } = useAchievements();
  const { playSound } = useSoundEffects();

  const maxAttempts = 10;
  
  // Sweet spot range narrows with difficulty
  const sweetSpotCenter = 50;
  const sweetSpotRange = Math.max(10, 25 - (difficulty * 3)); // Range decreases with difficulty

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setAttempts(0);
    setDifficulty(1);
    setPower(0);
    setDirection(1);
    speedRef.current = 2;
  };

  const animate = useCallback(() => {
    setPower((prev) => {
      let newPower = prev + (direction * speedRef.current);
      
      if (newPower >= 100) {
        newPower = 100;
        setDirection(-1);
      } else if (newPower <= 0) {
        newPower = 0;
        setDirection(1);
      }
      
      return newPower;
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [direction]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, animate]);

  const shoot = () => {
    if (gameState !== 'playing') return;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setGameState('shooting');
    
    // Check if shot is in sweet spot
    const distance = Math.abs(power - sweetSpotCenter);
    const made = distance <= sweetSpotRange;
    
    setTimeout(() => {
      if (made) {
        playSound('make');
        const points = Math.max(1, Math.floor(10 - (distance / 5))) * difficulty;
        setScore((prev) => prev + points);
        setStreak((prev) => prev + 1);
        setLastShot('made');
        
        // Increase difficulty every 3 makes
        if ((streak + 1) % 3 === 0) {
          setDifficulty((prev) => Math.min(prev + 1, 5));
          speedRef.current = Math.min(speedRef.current + 0.5, 5);
        }
      } else {
        playSound('block');
        setStreak(0);
        setLastShot('missed');
      }
      
      setAttempts((prev) => prev + 1);
      setGameState('result');
    }, 500);
  };

  useEffect(() => {
    if (gameState === 'result') {
      const timer = setTimeout(() => {
        if (attempts >= maxAttempts) {
          setGameState('finished');
          setShowResults(true);
        } else {
          setPower(0);
          setDirection(1);
          setGameState('playing');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, attempts]);

  const handleGameComplete = async () => {
    const result = {
      game_type: 'free_throw' as const,
      score,
      metadata: {
        attempts: maxAttempts,
        best_streak: streak,
        final_difficulty: difficulty,
      },
    };
    
    await saveGameResult(result);
    await checkAndUnlockAchievements(result, {
      games_played: userStats?.games_played || 0,
      current_streak: userStats?.current_streak || 0,
    });
  };

  if (showResults) {
    return (
      <GameResults
        gameType="free_throw"
        score={score}
        metadata={{
          attempts: maxAttempts,
          best_streak: streak,
        }}
        onPlayAgain={() => {
          setShowResults(false);
          startGame();
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
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Attempts</p>
            <p className="text-2xl font-bold">{attempts}/{maxAttempts}</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-orange-500">
              <Flame className="w-5 h-5" />
              <span className="font-bold">{streak}</span>
            </div>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Free Throw Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {gameState === 'ready' ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">How to Play</h3>
                <p className="text-muted-foreground">
                  Stop the power bar in the green zone to make your free throw!
                  <br />
                  Consecutive makes increase difficulty and points.
                </p>
              </div>
              <Button size="lg" onClick={startGame} className="bg-gradient-to-r from-orange-500 to-red-500">
                Start Game
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Power Bar */}
              <div className="relative">
                <div className="h-12 bg-secondary rounded-full overflow-hidden relative">
                  {/* Sweet Spot Zone */}
                  <div
                    className="absolute h-full bg-green-500/30"
                    style={{
                      left: `${sweetSpotCenter - sweetSpotRange}%`,
                      width: `${sweetSpotRange * 2}%`,
                    }}
                  />
                  {/* Perfect Zone */}
                  <div
                    className="absolute h-full bg-green-500/50 w-2"
                    style={{
                      left: `${sweetSpotCenter - 1}%`,
                    }}
                  />
                  {/* Power Indicator */}
                  <div
                    className={cn(
                      'absolute h-full w-3 rounded-full transition-colors',
                      gameState === 'shooting' 
                        ? lastShot === 'made' ? 'bg-green-500' : 'bg-red-500'
                        : 'bg-primary'
                    )}
                    style={{ left: `${power}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>0</span>
                  <span className="text-green-500 font-medium">Sweet Spot</span>
                  <span>100</span>
                </div>
              </div>

              {/* Shot Result */}
              {gameState === 'result' && lastShot && (
                <div className={cn(
                  'text-center text-2xl font-bold animate-in zoom-in-50 duration-300',
                  lastShot === 'made' ? 'text-green-500' : 'text-red-500'
                )}>
                  {lastShot === 'made' ? '🏀 SWISH!' : '❌ MISSED!'}
                </div>
              )}

              {/* Shoot Button */}
              {gameState === 'playing' && (
                <Button
                  size="lg"
                  className="w-full h-16 text-xl bg-gradient-to-r from-orange-500 to-red-500"
                  onClick={shoot}
                >
                  SHOOT!
                </Button>
              )}

              {/* Difficulty Indicator */}
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <div
                    key={d}
                    className={cn(
                      'w-3 h-3 rounded-full transition-colors',
                      d <= difficulty ? 'bg-orange-500' : 'bg-secondary'
                    )}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  Level {difficulty}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
