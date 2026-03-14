import { Sparkles, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { GameStats, SeasonStats } from '@/types/basketball';
import { cn } from '@/lib/utils';

interface DailyInsightProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  playerName: string;
}

interface Insight {
  message: string;
  type: 'positive' | 'neutral' | 'improvement';
  icon: React.ElementType;
}

function generateInsight(games: GameStats[], seasonStats: SeasonStats, playerName: string): Insight {
  if (games.length === 0) {
    return {
      message: `Ready to start tracking, ${playerName}? Log your first game to unlock personalized insights.`,
      type: 'neutral',
      icon: Sparkles,
    };
  }

  if (games.length < 3) {
    return {
      message: `🔥 ${games.length === 1 ? 'First game' : `${games.length} games`} logged.\nKeep tracking to unlock deeper performance insights.`,
      type: 'positive',
      icon: TrendingUp,
    };
  }

  const last3 = games.slice(0, 3);
  const previous3 = games.slice(3, 6);
  
  // Check shooting trends
  if (previous3.length >= 2) {
    const recentFgPct = last3.reduce((sum, g) => {
      const pct = g.fgAttempted > 0 ? (g.fgMade / g.fgAttempted) * 100 : 0;
      return sum + pct;
    }, 0) / last3.length;
    
    const prevFgPct = previous3.reduce((sum, g) => {
      const pct = g.fgAttempted > 0 ? (g.fgMade / g.fgAttempted) * 100 : 0;
      return sum + pct;
    }, 0) / previous3.length;
    
    const fgDiff = recentFgPct - prevFgPct;
    
    if (fgDiff > 5) {
      return {
        message: `Your shooting is heating up! FG% is up ${fgDiff.toFixed(0)}% in your last 3 games.`,
        type: 'positive',
        icon: TrendingUp,
      };
    }
    
    if (fgDiff < -8) {
      return {
        message: `Shooting has been tough lately. Focus on shot selection and getting to your spots.`,
        type: 'improvement',
        icon: Target,
      };
    }
  }

  // Check scoring trends
  if (previous3.length >= 2) {
    const recentPpg = last3.reduce((sum, g) => sum + g.points, 0) / last3.length;
    const prevPpg = previous3.reduce((sum, g) => sum + g.points, 0) / previous3.length;
    const pointsDiff = recentPpg - prevPpg;
    
    if (pointsDiff > 3) {
      return {
        message: `Scoring is up ${pointsDiff.toFixed(1)} points in your last 3 games. Keep the momentum!`,
        type: 'positive',
        icon: TrendingUp,
      };
    }
  }

  // Check turnovers
  const recentTov = last3.reduce((sum, g) => sum + g.turnovers, 0) / last3.length;
  if (recentTov > 4) {
    return {
      message: `${recentTov.toFixed(1)} turnovers per game lately. Slow down and protect the ball.`,
      type: 'improvement',
      icon: AlertCircle,
    };
  }

  // Check assists
  const recentAst = last3.reduce((sum, g) => sum + g.assists, 0) / last3.length;
  if (recentAst > seasonStats.avgAssists + 1) {
    return {
      message: `Great court vision! Averaging ${recentAst.toFixed(1)} assists in recent games.`,
      type: 'positive',
      icon: Sparkles,
    };
  }

  // Check win streak
  const recentWins = last3.filter(g => g.isWin).length;
  if (recentWins === 3) {
    return {
      message: `3 wins in a row! You're playing winning basketball right now.`,
      type: 'positive',
      icon: TrendingUp,
    };
  }

  // Default positive message
  return {
    message: `${seasonStats.avgPoints.toFixed(1)} PPG this season. Keep putting in the work!`,
    type: 'neutral',
    icon: Sparkles,
  };
}

export function DailyInsight({ games, seasonStats, playerName }: DailyInsightProps) {
  const insight = generateInsight(games, seasonStats, playerName);
  const Icon = insight.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      insight.type === 'positive' && "bg-green-500/5 border-green-500/20",
      insight.type === 'improvement' && "bg-amber-500/5 border-amber-500/20",
      insight.type === 'neutral' && "bg-primary/5 border-primary/20"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          insight.type === 'positive' && "bg-green-500/10",
          insight.type === 'improvement' && "bg-amber-500/10",
          insight.type === 'neutral' && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            insight.type === 'positive' && "text-green-500",
            insight.type === 'improvement' && "text-amber-500",
            insight.type === 'neutral' && "text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">Coach Insight</p>
          <p className="text-sm leading-relaxed">{insight.message}</p>
        </div>
      </div>
    </div>
  );
}
