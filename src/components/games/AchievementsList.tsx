import { 
  Gamepad2, Target, Brain, Zap, Trophy, TrendingUp, 
  Flame, Medal, Star, Award,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAchievements } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/types/games';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  gamepad: Gamepad2,
  target: Target,
  brain: Brain,
  zap: Zap,
  trophy: Trophy,
  'trending-up': TrendingUp,
  flame: Flame,
  medal: Medal,
  star: Star,
  stars: Award,
};

export function AchievementsList() {
  const { achievements, loading, isUnlocked } = useAchievements();

  // Filter to mini-game achievements only (exclude "stats" category which is for real games)
  const miniGameAchievements = achievements.filter(a => a.category !== 'stats');
  const totalPoints = miniGameAchievements.filter(a => isUnlocked(a.id)).reduce((sum, a) => sum + a.points, 0);
  const unlockedCount = miniGameAchievements.filter(a => isUnlocked(a.id)).length;
  const progress = miniGameAchievements.length > 0 ? (unlockedCount / miniGameAchievements.length) * 100 : 0;
  
  const groupedAchievements = miniGameAchievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryLabels: Record<string, string> = {
    games: '🎮 Mini-Games',
    engagement: '🔥 Engagement',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Mini-Game Badges</h3>
              <p className="text-sm text-muted-foreground">
                {unlockedCount} of {miniGameAchievements.length} unlocked
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-500">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Achievements by Category */}
      {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {categoryLabels[category] || category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryAchievements.map((achievement) => {
              const unlocked = isUnlocked(achievement.id);
              const IconComponent = ICON_MAP[achievement.icon] || Trophy;
              
              return (
                <Card
                  key={achievement.id}
                  className={cn(
                    'transition-all',
                    unlocked
                      ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                      : 'opacity-60'
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      unlocked
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                        : 'bg-secondary'
                    )}>
                      {unlocked ? (
                        <IconComponent className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-medium',
                        !unlocked && 'text-muted-foreground'
                      )}>
                        {achievement.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {achievement.description}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={cn(
                        'font-bold',
                        unlocked ? 'text-yellow-500' : 'text-muted-foreground'
                      )}>
                        +{achievement.points}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
