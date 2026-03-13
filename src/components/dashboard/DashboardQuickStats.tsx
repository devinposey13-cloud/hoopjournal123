import { TrendingUp, TrendingDown, Minus, Target, Percent, Flame, Star } from 'lucide-react';
import { GameStats, SeasonStats } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface DashboardQuickStatsProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  xpProgress?: {
    current_level: number;
    current_xp: number;
  } | null;
}

function getTrend(games: GameStats[], stat: keyof GameStats): 'up' | 'down' | 'neutral' {
  if (games.length < 3) return 'neutral';
  const recent3 = games.slice(0, 3);
  const previous3 = games.slice(3, 6);
  if (previous3.length < 2) return 'neutral';
  
  const recentAvg = recent3.reduce((sum, g) => sum + (Number(g[stat]) || 0), 0) / recent3.length;
  const prevAvg = previous3.reduce((sum, g) => sum + (Number(g[stat]) || 0), 0) / previous3.length;
  
  const diff = recentAvg - prevAvg;
  if (Math.abs(diff) < 0.5) return 'neutral';
  return diff > 0 ? 'up' : 'down';
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  accent?: boolean;
}

function QuickStatCard({ label, value, icon: Icon, trend, accent }: QuickStatCardProps) {
  return (
    <div className={cn(
      "flex-shrink-0 min-w-[100px] p-3 rounded-xl",
      "bg-card/50 border border-border/50",
      accent && "bg-primary/5 border-primary/20"
    )}>
      <div className="flex items-center justify-between mb-1">
        <Icon className={cn(
          "w-4 h-4",
          accent ? "text-primary" : "text-muted-foreground"
        )} />
        {trend && <TrendIcon trend={trend} />}
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function DashboardQuickStats({ games, seasonStats, xpProgress }: DashboardQuickStatsProps) {
  const lastGame = games[0];
  
  // Calculate current streak (consecutive wins or losses)
  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (const game of games) {
    if (streakType === null) {
      streakType = game.isWin ? 'W' : 'L';
      streak = 1;
    } else if ((game.isWin && streakType === 'W') || (!game.isWin && streakType === 'L')) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate last 5 games record
  const last5 = games.slice(0, 5);
  const last5Wins = last5.filter(g => g.isWin).length;
  const last5Losses = last5.length - last5Wins;

  const pointsTrend = getTrend(games, 'points');

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {/* Last Game Points */}
      {lastGame && (
        <QuickStatCard
          label="Last Game"
          value={lastGame.points}
          icon={Target}
          trend={pointsTrend}
        />
      )}

      {/* Season PPG */}
      <QuickStatCard
        label="PPG"
        value={seasonStats.avgPoints.toFixed(1)}
        icon={Star}
      />

      {/* FG% */}
      <QuickStatCard
        label="FG%"
        value={`${seasonStats.fgPercentage.toFixed(0)}%`}
        icon={Percent}
      />

      {/* Streak */}
      {streak > 0 && (
        <QuickStatCard
          label="Streak"
          value={`${streak}${streakType}`}
          icon={Flame}
          accent={streakType === 'W' && streak >= 3}
        />
      )}

      {/* Last 5 */}
      {last5.length > 0 && (
        <QuickStatCard
          label="Last 5"
          value={`${last5Wins}-${last5Losses}`}
          icon={TrendingUp}
        />
      )}

      {/* XP Level */}
      {xpProgress && (
        <QuickStatCard
          label="Level"
          value={xpProgress.current_level}
          icon={Star}
          accent
        />
      )}
    </div>
  );
}
