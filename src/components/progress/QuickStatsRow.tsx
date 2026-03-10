import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Percent, Zap, Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameStats, SeasonStats, ScheduledGame } from '@/types/basketball';
import type { XpProgress } from '@/types/xp';
import { calculateConsistencyStreak } from '@/utils/xpCalculations';

interface QuickStatsRowProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  xpProgress?: XpProgress | null;
  schedule?: ScheduledGame[];
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  delay?: number;
  variant?: 'default' | 'accent' | 'success' | 'warning';
}

function QuickStatCard({ label, value, icon, trend, trendValue, delay = 0, variant = 'default' }: QuickStatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    accent: 'bg-primary/5 border-primary/20',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
      className={cn(
        'flex-shrink-0 w-[120px] p-3 rounded-xl border shadow-sm',
        variantStyles[variant]
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-muted-foreground">{icon}</div>
        {trend && trend !== 'neutral' && (
          <div className={cn(
            'flex items-center text-xs font-medium',
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          )}>
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendValue && <span className="ml-0.5">{trendValue}</span>}
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function calculateLast5Trend(games: GameStats[]): { trend: 'up' | 'down' | 'neutral'; wins: number } {
  const last5 = games.slice(0, 5);
  const wins = last5.filter(g => g.isWin).length;
  
  if (last5.length < 2) return { trend: 'neutral', wins };
  
  const recentWins = last5.slice(0, Math.ceil(last5.length / 2)).filter(g => g.isWin).length;
  const olderWins = last5.slice(Math.ceil(last5.length / 2)).filter(g => g.isWin).length;
  
  if (recentWins > olderWins) return { trend: 'up', wins };
  if (recentWins < olderWins) return { trend: 'down', wins };
  return { trend: 'neutral', wins };
}

function calculateEfficiency(games: GameStats[]): number {
  if (games.length === 0) return 0;
  
  const total = games.reduce((acc, g) => {
    // Simple efficiency rating: (PTS + REB + AST + STL + BLK - TO) / GP
    return acc + g.points + g.rebounds + g.assists + g.steals + g.blocks - g.turnovers;
  }, 0);
  
  return Math.round((total / games.length) * 10) / 10;
}

export function QuickStatsRow({ games, seasonStats, xpProgress, schedule }: QuickStatsRowProps) {
  const sortedGames = [...games].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const last5 = calculateLast5Trend(sortedGames);
  const efficiency = calculateEfficiency(games);
  const streak = calculateConsistencyStreak(games, schedule ?? []);
  
  const stats = [
    {
      label: 'PPG',
      value: seasonStats.avgPoints.toFixed(1),
      icon: <Target className="h-4 w-4" />,
      variant: 'default' as const,
    },
    {
      label: 'FG%',
      value: `${seasonStats.fgPercentage.toFixed(0)}%`,
      icon: <Percent className="h-4 w-4" />,
      variant: 'default' as const,
    },
    {
      label: 'EFF',
      value: efficiency.toFixed(1),
      icon: <Zap className="h-4 w-4" />,
      variant: 'accent' as const,
    },
    {
      label: 'Level',
      value: xpProgress?.current_level || 1,
      icon: <Trophy className="h-4 w-4" />,
      variant: 'warning' as const,
    },
    {
      label: 'Streak',
      value: streak.current > 0 ? `🔥${streak.current}` : '0',
      icon: <Flame className="h-4 w-4" />,
      variant: streak.current >= 3 ? 'success' as const : 'default' as const,
    },
    {
      label: 'Best Streak',
      value: streak.best,
      icon: <Flame className="h-4 w-4" />,
      variant: streak.best >= 5 ? 'accent' as const : 'default' as const,
    },
  ];

  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {stats.map((stat, index) => (
          <QuickStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            trend={'trend' in stat ? (stat as { trend?: 'up' | 'down' | 'neutral' }).trend : undefined}
            delay={index * 0.05}
            variant={stat.variant}
          />
        ))}
      </div>
      {/* Fade edges for scroll indication */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
