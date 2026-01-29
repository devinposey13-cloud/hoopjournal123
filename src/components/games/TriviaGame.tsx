import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, HelpCircle, Timer, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { GameResults } from './GameResults';
import { triviaQuestions } from '@/data/triviaQuestions';
import { cn } from '@/lib/utils';
import type { TriviaQuestion } from '@/types/games';

interface TriviaGameProps {
  onBack: () => void;
}

type GameState = 'ready' | 'question' | 'answered' | 'finished';

const QUESTION_TIME = 15; // seconds
const QUESTIONS_PER_GAME = 10;

export function TriviaGame({ onBack }: TriviaGameProps) {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const { saveGameResult, userStats } = useGameData();
  const { checkAndUnlockAchievements } = useAchievements();
  const { playSound } = useSoundEffects();

  const startGame = () => {
    // Shuffle and select random questions
    const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, QUESTIONS_PER_GAME));
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(QUESTION_TIME);
    setSelectedAnswer(null);
    setGameState('question');
  };

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState === 'question' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'question' && timeLeft === 0) {
      // Time's up - mark as wrong
      handleAnswer(-1);
    }
    
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (gameState !== 'question') return;
    
    setSelectedAnswer(answerIndex);
    setGameState('answered');
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    
    if (isCorrect) {
      playSound('make');
      // More points for harder questions and faster answers
      const difficultyMultiplier = currentQuestion.difficulty === 'hard' ? 3 : currentQuestion.difficulty === 'medium' ? 2 : 1;
      const timeBonus = Math.floor(timeLeft * 2);
      const points = (10 + timeBonus) * difficultyMultiplier;
      
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        setBestStreak((best) => Math.max(best, newStreak));
        return newStreak;
      });
    } else {
      playSound('block');
      setStreak(0);
    }
  }, [gameState, questions, currentIndex, timeLeft, playSound]);

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState('finished');
      setShowResults(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(QUESTION_TIME);
      setSelectedAnswer(null);
      setGameState('question');
    }
  };

  const handleGameComplete = async () => {
    const result = {
      game_type: 'trivia' as const,
      score,
      metadata: {
        correct: correctCount,
        total: QUESTIONS_PER_GAME,
        accuracy: (correctCount / QUESTIONS_PER_GAME) * 100,
        streak: bestStreak,
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
        gameType="trivia"
        score={score}
        metadata={{
          correct: correctCount,
          total: QUESTIONS_PER_GAME,
          accuracy: Math.round((correctCount / QUESTIONS_PER_GAME) * 100),
          best_streak: bestStreak,
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

  const currentQuestion = questions[currentIndex];

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
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-lg font-bold">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Question</p>
              <p className="text-lg font-bold">{currentIndex + 1}/{QUESTIONS_PER_GAME}</p>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1 text-orange-500">
                <span className="text-sm">🔥</span>
                <span className="font-bold">{streak}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Basketball Trivia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {gameState === 'ready' ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Test Your Knowledge!</h3>
                <p className="text-muted-foreground">
                  Answer {QUESTIONS_PER_GAME} basketball trivia questions.
                  <br />
                  Faster answers = more points!
                </p>
              </div>
              
              <Button
                size="lg"
                onClick={startGame}
                className="bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                Start Quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Timer Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className={cn(
                      'font-mono',
                      timeLeft <= 5 && 'text-red-500 animate-pulse'
                    )}>
                      {timeLeft}s
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    currentQuestion?.difficulty === 'hard' && 'bg-red-500/20 text-red-500',
                    currentQuestion?.difficulty === 'medium' && 'bg-yellow-500/20 text-yellow-500',
                    currentQuestion?.difficulty === 'easy' && 'bg-green-500/20 text-green-500'
                  )}>
                    {currentQuestion?.difficulty}
                  </span>
                </div>
                <Progress
                  value={(timeLeft / QUESTION_TIME) * 100}
                  className="h-2"
                />
              </div>

              {/* Question */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase mb-2">
                  {currentQuestion?.category}
                </p>
                <h3 className="text-xl font-semibold">{currentQuestion?.question}</h3>
              </div>

              {/* Answers */}
              <div className="grid gap-3">
                {currentQuestion?.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctIndex;
                  const showResult = gameState === 'answered';
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        'h-auto py-4 px-6 text-left justify-start text-base transition-all',
                        showResult && isCorrect && 'bg-green-500/20 border-green-500 text-green-700',
                        showResult && isSelected && !isCorrect && 'bg-red-500/20 border-red-500 text-red-700',
                        !showResult && 'hover:bg-primary/10'
                      )}
                      onClick={() => handleAnswer(index)}
                      disabled={gameState === 'answered'}
                    >
                      <span className="mr-3 w-6 h-6 flex items-center justify-center rounded-full bg-secondary text-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Next Button */}
              {gameState === 'answered' && (
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  onClick={nextQuestion}
                >
                  {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
