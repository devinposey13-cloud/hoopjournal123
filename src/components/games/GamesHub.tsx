import { useState, useMemo } from 'react';
import { Gamepad2, Target, Brain, Zap, HelpCircle, TrendingUp, Trophy, Medal, Flame, Star, CalendarDays } from 'lucide-react';
import { GameCard } from './GameCard';
import { FreeThrowGame } from './FreeThrowGame';
import { MemoryMatchGame } from './MemoryMatchGame';
import { ReactionDrillGame } from './ReactionDrillGame';
import { TriviaGame } from './TriviaGame';
import { StatsPredictorGame } from './StatsPredictorGame';
import { Leaderboard } from './Leaderboard';
import { AchievementsList } from './AchievementsList';
import { SeasonLeaderboard } from '@/components/xp/SeasonLeaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useGameData } from '@/hooks/useGameData';
import { useAchievements } from '@/hooks/useAchievements';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GameType } from '@/types/games';

type View = 'hub' | GameType;

// Rotate daily challenge based on day of year
const DAILY_CHALLENGES = [
  { game: 'free_throw' as GameType, title: 'Score 90+ in Free Throw Challenge', reward: '+50 XP', icon: Target },
  { game: 'reaction_drill' as GameType, title: 'Get under 250ms in Reaction Drill', reward: '+50 XP', icon: Zap },
  { game: 'trivia' as GameType, title: 'Answer 8/10 correctly in Trivia', reward: '+50 XP', icon: HelpCircle },
  { game: 'memory_match' as GameType, title: 'Complete Memory Match under 30s', reward: '+50 XP', icon: Brain },
];

// Rotate featured game based on day
const FEATURED_GAMES: GameType[] = ['reaction_drill', 'free_throw', 'trivia', 'memory_match', 'stats_predictor'];

export function GamesHub() {
  const [currentView, setCurrentView] = useState<View>('hub');
  const { userStats, loading: statsLoading } = useGameData();
  const { getUnlockedCount, achievements, loading: achievementsLoading } = useAchievements();

  const dayOfYear = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  }, []);

  const dailyChallenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
  const featuredGameId = FEATURED_GAMES[dayOfYear % FEATURED_GAMES.length];

  const games = [
    {
      id: 'free_throw' as GameType,
      title: 'Free Throw Challenge',
      description: 'Test your shooting timing using a moving power bar. Hit the sweet spot to sink free throws.',
      icon: Target,
      color: 'from-orange-500 to-red-500',
      highScore: userStats?.free_throw_high_score || 0,
      highScoreLabel: 'High Score',
      xpLabel: '+25 XP per game',
    },
    {
      id: 'memory_match' as GameType,
      title: 'Memory Match',
      description: 'Match basketball-themed cards to test and improve your memory and focus.',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      highScore: userStats?.memory_match_best_time || null,
      highScoreLabel: 'Best Time',
      suffix: 's',
      xpLabel: 'Earn XP based on score',
    },
    {
      id: 'reaction_drill' as GameType,
      title: 'Reaction Drill',
      description: 'Train your reaction speed by responding to prompts as quickly as possible.',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      highScore: userStats?.reaction_best_time || null,
      highScoreLabel: 'Best Time',
      suffix: 'ms',
      xpLabel: '+30 XP per game',
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
      xpLabel: 'Earn XP for correct answers',
    },
    {
      id: 'stats_predictor' as GameType,
      title: 'Stats Predictor',
      description: 'Predict your stats before upcoming games. Earn XP and rewards for accurate predictions.',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      highScore: userStats?.prediction_accuracy ? Math.round(userStats.prediction_accuracy) : null,
      highScoreLabel: 'Accuracy',
      suffix: '%',
      xpLabel: 'Earn XP for accuracy',
    },
  ];

  const featuredGame = games.find(g => g.id === featuredGameId) || games[0];

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

  const unlockedCount = achievementsLoading ? 0 : getUnlockedCount();
  const totalAchievements = achievements.length || 10;
  const achievementPct = Math.round((unlockedCount / totalAchievements) * 100);
  const streakCount = userStats?.current_streak || 0;

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
            {achievementsLoading ? '...' : `${unlockedCount}/${totalAchievements}`}
          </p>
          <Progress value={achievementPct} className="h-1.5 mt-2" />
        </div>
        <div className={cn(
          'bg-card rounded-xl p-4 border transition-all duration-300 relative overflow-hidden',
          streakCount > 0
            ? 'border-orange-500/50 animate-pulse-glow'
            : 'border-border'
        )}>
          {/* Fire background effect for high streaks */}
          {streakCount >= 3 && (
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
              <Flame className={cn(
                'w-4 h-4',
                streakCount > 0 ? 'text-orange-500' : '',
                streakCount >= 3 && 'animate-fire-flicker'
              )} />
              <span className="text-sm font-medium">Current Streak</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              streakCount > 0 && 'text-orange-500',
              streakCount >= 3 && 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
            )}>
              {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="games">Skill Games</TabsTrigger>
          <TabsTrigger value="season">
            <Star className="w-4 h-4 mr-1" />
            Season
          </TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="mt-6 space-y-6">
          {/* Daily Challenge */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5 overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary uppercase tracking-wide mb-0.5">Daily Challenge</p>
                  <p className="text-sm font-semibold text-foreground">{dailyChallenge.title}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">{dailyChallenge.reward}</span>
                    <span className="text-xs text-muted-foreground ml-1">+ Badge Progress</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCurrentView(dailyChallenge.game)}
                  className="flex-shrink-0"
                >
                  Play
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Featured Skill Game */}
          <Card className="border-border bg-card overflow-hidden">
            <div className={cn('h-1.5 bg-gradient-to-r', featuredGame.color)} />
            <CardContent className="p-4 sm:p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Featured Skill Game</p>
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl bg-gradient-to-br flex-shrink-0', featuredGame.color)}>
                  <featuredGame.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-foreground">{featuredGame.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{featuredGame.description}</p>
                </div>
                <Button
                  onClick={() => setCurrentView(featuredGame.id)}
                  className={cn('bg-gradient-to-r text-white flex-shrink-0', featuredGame.color)}
                  size="sm"
                >
                  Play Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Grid */}
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
                xpLabel={game.xpLabel}
                onClick={() => setCurrentView(game.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="season" className="mt-6">
          <SeasonLeaderboard />
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
