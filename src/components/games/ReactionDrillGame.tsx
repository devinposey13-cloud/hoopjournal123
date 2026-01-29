import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Zap, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResults } from './GameResults';
import { cn } from '@/lib/utils';

interface ReactionDrillGameProps {
  onBack: () => void;
}

type Action = 'shoot' | 'pass' | 'steal' | 'block';
type GameState = 'ready' | 'waiting' | 'prompt' | 'result' | 'finished';

const ACTIONS: { id: Action; label: string; color: string; icon: string }[] = [
  { id: 'shoot', label: 'SHOOT!', color: 'from-orange-500 to-red-500', icon: '🏀' },
  { id: 'pass', label: 'PASS!', color: 'from-blue-500 to-cyan-500', icon: '🤾' },
  { id: 'steal', label: 'STEAL!', color: 'from-green-500 to-emerald-500', icon: '👋' },
  { id: 'block', label: 'BLOCK!', color: 'from-purple-500 to-pink-500', icon: '✋' },
];

const TOTAL_ROUNDS = 10;

export function ReactionDrillGame({ onBack }: ReactionDrillGameProps) {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const [round, setRound] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastResult, setLastResult] = useState<{ correct: boolean; time: number } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [tooEarly, setTooEarly] = useState(false);
  
  const promptTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const { saveGameResult, userStats } = useGameData();
  const { checkAndUnlockAchievements } = useAchievements();
  const { playSound } = useSoundEffects();

  const startGame = () => {
    setGameState('waiting');
    setRound(1);
    setReactionTimes([]);
    setCorrectCount(0);
    setTooEarly(false);
    schedulePrompt();
  };

  const schedulePrompt = useCallback(() => {
    // Random delay between 1-3 seconds
    const delay = 1000 + Math.random() * 2000;
    
    timeoutRef.current = setTimeout(() => {
      const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      setCurrentAction(randomAction.id);
      promptTimeRef.current = performance.now();
      setGameState('prompt');
    }, delay);
  }, []);

  const handleAction = (action: Action) => {
    if (gameState === 'waiting') {
      // Clicked too early
      setTooEarly(true);
      playSound('block');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      setTimeout(() => {
        setTooEarly(false);
        if (round < TOTAL_ROUNDS) {
          setGameState('waiting');
          schedulePrompt();
        } else {
          setGameState('finished');
          setShowResults(true);
        }
        setRound((prev) => prev + 1);
      }, 1000);
      return;
    }
    
    if (gameState !== 'prompt') return;
    
    const reactionTime = Math.round(performance.now() - promptTimeRef.current);
    const isCorrect = action === currentAction;
    
    if (isCorrect) {
      playSound('make');
      setCorrectCount((prev) => prev + 1);
      setReactionTimes((prev) => [...prev, reactionTime]);
    } else {
      playSound('block');
    }
    
    setLastResult({ correct: isCorrect, time: reactionTime });
    setGameState('result');
  };

  useEffect(() => {
    if (gameState === 'result') {
      const timer = setTimeout(() => {
        if (round >= TOTAL_ROUNDS) {
          setGameState('finished');
          setShowResults(true);
        } else {
          setRound((prev) => prev + 1);
          setGameState('waiting');
          schedulePrompt();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, round, schedulePrompt]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getAverageTime = (): number => {
    if (reactionTimes.length === 0) return 0;
    return Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
  };

  const calculateScore = (): number => {
    const accuracy = (correctCount / TOTAL_ROUNDS) * 100;
    const avgTime = getAverageTime();
    const timeBonus = avgTime > 0 ? Math.max(0, 500 - avgTime) : 0;
    
    return Math.floor(accuracy + timeBonus);
  };

  const handleGameComplete = async () => {
    const avgTime = getAverageTime();
    const result = {
      game_type: 'reaction_drill' as const,
      score: calculateScore(),
      metadata: {
        correct: correctCount,
        total: TOTAL_ROUNDS,
        avg_reaction_time: avgTime,
        fastest_time: reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0,
        accuracy: (correctCount / TOTAL_ROUNDS) * 100,
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
        gameType="reaction_drill"
        score={calculateScore()}
        metadata={{
          correct: correctCount,
          total: TOTAL_ROUNDS,
          avg_reaction_time: getAverageTime(),
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

  const currentActionData = ACTIONS.find((a) => a.id === currentAction);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {gameState !== 'ready' && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Round</p>
              <p className="text-lg font-bold">{round}/{TOTAL_ROUNDS}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Correct</p>
              <p className="text-lg font-bold text-green-500">{correctCount}</p>
            </div>
            {reactionTimes.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Time</p>
                <p className="text-lg font-bold">{getAverageTime()}ms</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Reaction Drill
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {gameState === 'ready' ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">How to Play</h3>
                <p className="text-muted-foreground">
                  Wait for a prompt to appear, then tap the matching action as fast as possible!
                  <br />
                  Don&apos;t click too early or it won&apos;t count.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {ACTIONS.map((action) => (
                  <div
                    key={action.id}
                    className={cn(
                      'p-4 rounded-lg bg-gradient-to-r text-white text-center',
                      action.color
                    )}
                  >
                    <div className="text-2xl mb-1">{action.icon}</div>
                    <div className="font-medium">{action.label}</div>
                  </div>
                ))}
              </div>
              
              <Button
                size="lg"
                onClick={startGame}
                className="bg-gradient-to-r from-yellow-500 to-orange-500"
              >
                Start Game
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Prompt Area */}
              <div className="h-48 flex items-center justify-center">
                {gameState === 'waiting' && !tooEarly && (
                  <div className="text-center">
                    <Timer className="w-16 h-16 mx-auto text-muted-foreground animate-pulse" />
                    <p className="mt-4 text-lg text-muted-foreground">Wait for it...</p>
                  </div>
                )}
                
                {tooEarly && (
                  <div className="text-center animate-in zoom-in-50">
                    <p className="text-3xl font-bold text-red-500">TOO EARLY!</p>
                    <p className="text-muted-foreground">Wait for the prompt</p>
                  </div>
                )}
                
                {gameState === 'prompt' && currentActionData && (
                  <div
                    className={cn(
                      'text-center p-8 rounded-2xl bg-gradient-to-r text-white animate-in zoom-in-75 duration-200',
                      currentActionData.color
                    )}
                  >
                    <div className="text-6xl mb-2">{currentActionData.icon}</div>
                    <div className="text-4xl font-bold">{currentActionData.label}</div>
                  </div>
                )}
                
                {gameState === 'result' && lastResult && (
                  <div className="text-center animate-in zoom-in-50">
                    <p className={cn(
                      'text-3xl font-bold',
                      lastResult.correct ? 'text-green-500' : 'text-red-500'
                    )}>
                      {lastResult.correct ? '✓ CORRECT!' : '✗ WRONG!'}
                    </p>
                    {lastResult.correct && (
                      <p className="text-xl text-muted-foreground">{lastResult.time}ms</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    size="lg"
                    className={cn(
                      'h-20 text-lg bg-gradient-to-r text-white',
                      action.color
                    )}
                    onClick={() => handleAction(action.id)}
                    disabled={gameState === 'result'}
                  >
                    <span className="text-2xl mr-2">{action.icon}</span>
                    {action.id.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
