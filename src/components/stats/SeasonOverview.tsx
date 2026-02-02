import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Repeat, Zap, Shield, HandMetal, CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import type { GameStats, SeasonStats } from '@/types/basketball';
import { calculateTrend, calculateWinLossSplits, getPerformanceTimeline } from '@/utils/statsCalculations';

interface SeasonOverviewProps {
  games: GameStats[];
  seasonStats: SeasonStats;
}

const statConfig = [
  { key: 'points', label: 'PPG', icon: Target, color: 'hsl(var(--primary))' },
  { key: 'rebounds', label: 'RPG', icon: Repeat, color: 'hsl(var(--secondary))' },
  { key: 'assists', label: 'APG', icon: Zap, color: 'hsl(var(--accent))' },
  { key: 'steals', label: 'SPG', icon: Shield, color: 'hsl(142, 76%, 36%)' },
  { key: 'blocks', label: 'BPG', icon: HandMetal, color: 'hsl(262, 83%, 58%)' },
  { key: 'turnovers', label: 'TO/G', icon: CircleDot, color: 'hsl(var(--destructive))' },
] as const;

const chartConfig = {
  points: { label: 'Points', color: 'hsl(var(--primary))' },
  rebounds: { label: 'Rebounds', color: 'hsl(var(--secondary))' },
  assists: { label: 'Assists', color: 'hsl(var(--accent))' },
};

export function SeasonOverview({ games, seasonStats }: SeasonOverviewProps) {
  const timelineData = getPerformanceTimeline(games);
  const winLossSplits = calculateWinLossSplits(games);

  return (
    <div className="space-y-6">
      {/* Stat Cards with Trends */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statConfig.map(({ key, label, icon: Icon, color }, index) => {
          const trend = calculateTrend(games, key);
          const avgKey = `avg${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof SeasonStats;
          const value = key === 'turnovers' 
            ? (games.reduce((acc, g) => acc + g.turnovers, 0) / Math.max(games.length, 1)).toFixed(1)
            : (seasonStats[avgKey] as number)?.toFixed(1) || '0.0';

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {games.length >= 2 && (
                      <div className={`flex items-center text-xs ${
                        key === 'turnovers' 
                          ? (trend.isUp ? 'text-destructive' : 'text-green-500')
                          : (trend.isUp ? 'text-green-500' : 'text-destructive')
                      }`}>
                        {trend.change === 0 ? (
                          <Minus className="h-3 w-3" />
                        ) : key === 'turnovers' ? (
                          trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                        ) : (
                          trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="ml-1">{trend.change}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Shooting Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Shooting Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Field Goal %</span>
                  <span className="font-medium">{seasonStats.fgPercentage}%</span>
                </div>
                <Progress value={seasonStats.fgPercentage} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">3-Point %</span>
                  <span className="font-medium">{seasonStats.threePtPercentage}%</span>
                </div>
                <Progress value={seasonStats.threePtPercentage} className="h-2 [&>div]:bg-accent" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Free Throw %</span>
                  <span className="font-medium">{seasonStats.ftPercentage}%</span>
                </div>
                <Progress value={seasonStats.ftPercentage} className="h-2 [&>div]:bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Over Time */}
      {games.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="points" 
                      stroke="var(--color-points)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-points)', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rebounds" 
                      stroke="var(--color-rebounds)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-rebounds)', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="assists" 
                      stroke="var(--color-assists)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-assists)', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Win/Loss Impact */}
      {games.length >= 3 && winLossSplits.wins.gamesPlayed > 0 && winLossSplits.losses.gamesPlayed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Win/Loss Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">In Wins ({winLossSplits.wins.gamesPlayed})</p>
                  <div className="space-y-1 text-sm">
                    <p>{winLossSplits.wins.avgPoints} PPG</p>
                    <p>{winLossSplits.wins.avgRebounds} RPG</p>
                    <p>{winLossSplits.wins.avgAssists} APG</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive mb-2">In Losses ({winLossSplits.losses.gamesPlayed})</p>
                  <div className="space-y-1 text-sm">
                    <p>{winLossSplits.losses.avgPoints} PPG</p>
                    <p>{winLossSplits.losses.avgRebounds} RPG</p>
                    <p>{winLossSplits.losses.avgAssists} APG</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
