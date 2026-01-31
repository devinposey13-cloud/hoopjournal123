import { useState } from 'react';
import { Gamepad2, Target, Brain, Zap, HelpCircle, TrendingUp, Trophy, Medal, Flame } from 'lucide-react';
import { GameCard } from './GameCard';
import { FreeThrowGame } from './FreeThrowGame';
import { MemoryMatchGame } from './MemoryMatchGame';
import { ReactionDrillGame } from './ReactionDrillGame';
import { TriviaGame } from './TriviaGame';
import { StatsPredictorGame } from './StatsPredictorGame';
import { Leaderboard } from './Leaderboard';
import { AchievementsList } from './AchievementsList';
import { cn } from '@/lib/utils';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GameType } from '@/types/games';

type View = 'hub' | GameType;

export function GamesHub() {
  const [currentView, setCurrentView] = useState<View>('hub');
  const { userStats, loading: statsLoading } = useGameData();
  const { getUnlockedCount, achievements, loading: achievementsLoading } = useAchievements();

  const games = [
    {
      id: 'free_throw' as GameType,
      title: 'Free Throw Challenge',
      description: 'Test your timing with a moving power bar. Hit the sweet spot to sink free throws!',
      icon: Target,
      color: 'from-orange-500 to-red-500',
      highScore: userStats?.free_throw_high_score || 0,
      highScoreLabel: 'High Score',
    },
    {
      id: 'memory_match' as GameType,
      title: 'Memory Match',
      description: 'Match basketball-themed cards. Test your memory with different grid sizes!',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      highScore: userStats?.memory_match_best_time || null,
      highScoreLabel: 'Best Time',
      suffix: 's',
    },
    {
      id: 'reaction_drill' as GameType,
      title: 'Reaction Drill',
      description: 'Quick reflexes win games! React to prompts as fast as possible.',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      highScore: userStats?.reaction_best_time || null,
      highScoreLabel: 'Best Time',
      suffix: 'ms',
    },
    {
      id: 'trivia' as GameType,
      title: 'Basketball Trivia',
      description: 'Test your basketball knowledge with questions about rules, history, and legends.',
      icon: HelpCircle,
      color: 'from-blue-500 to-cyan-500',
      highScore: userStats?.trivia_accuracy ? Math.round(userStats.trivia_accuracy) : null,
      highScoreLabel: 'Accuracy',
      suffix: '%',
    },
    {
      id: 'stats_predictor' as GameType,
      title: 'Stats Predictor',
      description: 'Predict your stats before games. Earn points for accurate predictions!',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      highScore: userStats?.prediction_accuracy ? Math.round(userStats.prediction_accuracy) : null,
      highScoreLabel: 'Accuracy',
      suffix: '%',
    },
  ];

  const renderGame = () => {
    switch (currentView) {
      case 'free_throw':
        return <FreeThrowGame onBack={() => setCurrentView('hub')} />;
      case 'memory_match':
        return <MemoryMatchGame onBack={() => setCurrentView('hub')} />;
      case 'reaction_drill':
        return <ReactionDrillGame onBack={() => setCurrentView('hub')} />;
      case 'trivia':
        return <TriviaGame onBack={() => setCurrentView('hub')} />;
      case 'stats_predictor':
        return <StatsPredictorGame onBack={() => setCurrentView('hub')} />;
      default:
        return null;
    }
  };

  if (currentView !== 'hub') {
    return renderGame();
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Gamepad2 className="w-4 h-4" />
            <span className="text-sm">Games Played</span>
          </div>
          <p className="text-2xl font-bold">{userStats?.games_played || 0}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Total Points</span>
          </div>
          <p className="text-2xl font-bold">{userStats?.total_points || 0}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Medal className="w-4 h-4" />
            <span className="text-sm">Achievements</span>
          </div>
          <p className="text-2xl font-bold">
            {achievementsLoading ? '...' : `${getUnlockedCount()}/${achievements.length}`}
          </p>
        </div>
        <div className={cn(
          'bg-card rounded-xl p-4 border transition-all duration-300 relative overflow-hidden',
          (userStats?.current_streak || 0) > 0
            ? 'border-orange-500/50 animate-pulse-glow'
            : 'border-border'
        )}>
          {/* Fire background effect for high streaks */}
          {(userStats?.current_streak || 0) >= 3 && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-16 animate-fire-flicker">
                <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-orange-500/20 to-transparent rounded-full blur-xl" />
              </div>
              <div className="absolute bottom-0 left-1/3 w-16 h-12 animate-fire-flicker" style={{ animationDelay: '0.15s' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-red-500/30 via-orange-400/15 to-transparent rounded-full blur-lg" />
              </div>
              <div className="absolute bottom-0 right-1/3 w-16 h-12 animate-fire-flicker" style={{ animationDelay: '0.3s' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/30 via-orange-400/15 to-transparent rounded-full blur-lg" />
              </div>
            </div>
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {(userStats?.current_streak || 0) > 0 ? (
                <Flame className={cn(
                  'w-4 h-4 text-orange-500',
                  (userStats?.current_streak || 0) >= 3 && 'animate-fire-flicker'
                )} />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span className="text-sm">Current Streak</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              (userStats?.current_streak || 0) > 0 && 'text-orange-500',
              (userStats?.current_streak || 0) >= 3 && 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
            )}>
              {userStats?.current_streak || 0} days
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games">Mini-Games</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                description={game.description}
                icon={game.icon}
                gradientClass={game.color}
                highScore={game.highScore}
                highScoreLabel={game.highScoreLabel}
                suffix={game.suffix}
                onClick={() => setCurrentView(game.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          <AchievementsList />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
