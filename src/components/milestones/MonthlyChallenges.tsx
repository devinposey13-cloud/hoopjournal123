import { useMemo } from 'react';
import { Calendar, Clock, Trophy, Zap, Star, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMonthlyChallenges, ChallengeWithProgress } from '@/hooks/useMonthlyChallenges';
import { cn } from '@/lib/utils';

interface ChallengeCardProps {
  challenge: ChallengeWithProgress;
}

function ChallengeCard({ challenge }: ChallengeCardProps) {
  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const difficultyIcons = {
    easy: <Zap className="w-3 h-3" />,
    medium: <Star className="w-3 h-3" />,
    hard: <Flame className="w-3 h-3" />,
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all duration-300',
        challenge.isCompleted
          ? 'bg-primary/10 border-primary/30'
          : 'bg-card border-border hover:border-primary/20'
      )}
    >
      {/* Completed checkmark */}
      {challenge.isCompleted && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl">{challenge.icon}</div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{challenge.name}</h4>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', difficultyColors[challenge.difficulty])}
            >
              {difficultyIcons[challenge.difficulty]}
              <span className="ml-1 capitalize">{challenge.difficulty}</span>
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-2">{challenge.description}</p>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {challenge.currentValue} / {challenge.threshold}
              </span>
              <span className="font-medium text-primary">+{challenge.rewardPoints} pts</span>
            </div>
            <Progress
              value={challenge.progress}
              className={cn('h-1.5', challenge.isCompleted && '[&>div]:bg-primary')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyChallenges() {
  const { challenges, loading, daysRemaining, themeName, stats } = useMonthlyChallenges();

  // Format countdown text
  const countdownText = useMemo(() => {
    if (daysRemaining === 0) return 'Last day!';
    if (daysRemaining === 1) return '1 day left';
    return `${daysRemaining} days left`;
  }, [daysRemaining]);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (challenges.length === 0) {
    return null; // No active challenges
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              {themeName || 'Monthly Challenges'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">
                {stats.completed}/{stats.total} Complete
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.totalPoints} pts earned
              </div>
            </div>
            {/* Countdown */}
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Clock className="w-3 h-3" />
              {countdownText}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {challenges.map(challenge => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
