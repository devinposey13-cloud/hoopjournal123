import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft, RotateCcw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FireCelebration } from '@/components/FireCelebration';
import type { GameType } from '@/types/games';
import { cn } from '@/lib/utils';

interface GameResultsProps {
  gameType: GameType;
  score: number;
  metadata: Record<string, unknown>;
  onPlayAgain: () => void;
  onBack: () => void;
  onComplete: () => Promise<void>;
}

const GAME_NAMES: Record<GameType, string> = {
  free_throw: 'Free Throw Challenge',
  memory_match: 'Memory Match',
  reaction_drill: 'Reaction Drill',
  trivia: 'Basketball Trivia',
  stats_predictor: 'Stats Predictor',
};

const GAME_COLORS: Record<GameType, string> = {
  free_throw: 'from-orange-500 to-red-500',
  memory_match: 'from-purple-500 to-pink-500',
  reaction_drill: 'from-yellow-500 to-orange-500',
  trivia: 'from-blue-500 to-cyan-500',
  stats_predictor: 'from-green-500 to-emerald-500',
};

export function GameResults({
  gameType,
  score,
  metadata,
  onPlayAgain,
  onBack,
  onComplete,
}: GameResultsProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Show celebration for high scores
    if (score >= 100) {
      setShowCelebration(true);
      // Auto-hide celebration after 3 seconds
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [score]);

  useEffect(() => {
    // Save the game result
    onComplete().then(() => setSaved(true));
  }, [onComplete]);

  const renderStats = () => {
    switch (gameType) {
      case 'free_throw':
        return (
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Attempts" value={metadata.attempts as number} />
            <StatBox label="Best Streak" value={metadata.best_streak as number} suffix="🔥" />
          </div>
        );
      case 'memory_match':
        return (
          <div className="grid grid-cols-3 gap-4">
            <StatBox label="Grid Size" value={metadata.grid_size as string} />
            <StatBox label="Moves" value={metadata.moves as number} />
            <StatBox label="Time" value={`${metadata.time_seconds}s`} />
          </div>
        );
      case 'reaction_drill':
        return (
          <div className="grid grid-cols-3 gap-4">
            <StatBox label="Correct" value={`${metadata.correct}/${metadata.total}`} />
            <StatBox label="Avg Time" value={`${metadata.avg_reaction_time}ms`} />
            <StatBox label="Accuracy" value={`${Math.round((metadata.correct as number) / (metadata.total as number) * 100)}%`} />
          </div>
        );
      case 'trivia':
        return (
          <div className="grid grid-cols-3 gap-4">
            <StatBox label="Correct" value={`${metadata.correct}/${metadata.total}`} />
            <StatBox label="Accuracy" value={`${metadata.accuracy}%`} />
            <StatBox label="Best Streak" value={metadata.best_streak as number} suffix="🔥" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {showCelebration && (
        <FireCelebration show={showCelebration} onComplete={() => setShowCelebration(false)} />
      )}
      
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className={cn('bg-gradient-to-r text-white', GAME_COLORS[gameType])}>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {GAME_NAMES[gameType]} - Results
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center space-y-8">
            {/* Score */}
            <div className="space-y-2">
              <p className="text-muted-foreground">Your Score</p>
              <div className={cn(
                'text-6xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
                GAME_COLORS[gameType]
              )}>
                {score}
              </div>
              {score >= 100 && (
                <p className="text-green-500 font-medium">🎉 Amazing performance!</p>
              )}
            </div>

            {/* Stats */}
            {renderStats()}

            {/* Status */}
            <p className="text-sm text-muted-foreground">
              {saved ? '✓ Score saved to leaderboard' : 'Saving score...'}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={onPlayAgain}
                className={cn('bg-gradient-to-r text-white', GAME_COLORS[gameType])}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  // Share functionality (could be expanded)
                  if (navigator.share) {
                    navigator.share({
                      title: `${GAME_NAMES[gameType]} Score`,
                      text: `I scored ${score} points in ${GAME_NAMES[gameType]} on Hoop Journal! 🏀`,
                    });
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ 
  label, 
  value, 
  suffix 
}: { 
  label: string; 
  value: string | number; 
  suffix?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-secondary/50 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">
        {value}
        {suffix && <span className="ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
