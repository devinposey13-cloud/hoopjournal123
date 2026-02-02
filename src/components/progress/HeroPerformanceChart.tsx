import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Target, Repeat, Zap, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { GameStats } from '@/types/basketball';

interface HeroPerformanceChartProps {
  games: GameStats[];
}

type MetricType = 'points' | 'rebounds' | 'assists' | 'efficiency';

const metrics = [
  { key: 'points' as MetricType, label: 'PTS', icon: Target, color: 'hsl(var(--primary))' },
  { key: 'rebounds' as MetricType, label: 'REB', icon: Repeat, color: 'hsl(var(--accent))' },
  { key: 'assists' as MetricType, label: 'AST', icon: Zap, color: 'hsl(142, 76%, 36%)' },
  { key: 'efficiency' as MetricType, label: 'EFF', icon: Activity, color: 'hsl(262, 83%, 58%)' },
];

const chartConfig = {
  points: { label: 'Points', color: 'hsl(var(--primary))' },
  rebounds: { label: 'Rebounds', color: 'hsl(var(--accent))' },
  assists: { label: 'Assists', color: 'hsl(142, 76%, 36%)' },
  efficiency: { label: 'Efficiency', color: 'hsl(262, 83%, 58%)' },
};

export function HeroPerformanceChart({ games }: HeroPerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('points');
  
  const sortedGames = [...games]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10);

  const data = sortedGames.map((game) => ({
    date: format(new Date(game.date), 'MMM d'),
    opponent: game.opponent,
    points: game.points,
    rebounds: game.rebounds,
    assists: game.assists,
    efficiency: game.points + game.rebounds + game.assists + game.steals + game.blocks - game.turnovers,
    isWin: game.isWin,
  }));

  const activeMetricConfig = metrics.find(m => m.key === activeMetric)!;

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Log games to see your performance trends</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base">Performance Trends</h3>
              <p className="text-xs text-muted-foreground">Last 10 games</p>
            </div>
            
            {/* Metric Toggle */}
            <ToggleGroup 
              type="single" 
              value={activeMetric} 
              onValueChange={(v) => v && setActiveMetric(v as MetricType)}
              className="justify-start"
            >
              {metrics.map((metric) => (
                <ToggleGroupItem
                  key={metric.key}
                  value={metric.key}
                  aria-label={metric.label}
                  className={cn(
                    'gap-1.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
                    'px-2.5 h-8'
                  )}
                >
                  <metric.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{metric.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 pb-4">
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeMetricConfig.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={activeMetricConfig.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="stroke-muted/30" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-medium mb-1">vs {data.opponent}</p>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: activeMetricConfig.color }}
                          />
                          <span className="font-bold">{data[activeMetric]}</span>
                          <span className="text-xs text-muted-foreground">
                            {activeMetricConfig.label}
                          </span>
                        </div>
                        <div className={cn(
                          'text-xs mt-1 font-medium',
                          data.isWin ? 'text-green-500' : 'text-red-500'
                        )}>
                          {data.isWin ? 'WIN' : 'LOSS'}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={activeMetricConfig.color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${activeMetric})`}
                  dot={{ 
                    fill: activeMetricConfig.color, 
                    strokeWidth: 2, 
                    r: 4,
                    stroke: 'hsl(var(--background))'
                  }}
                  activeDot={{ 
                    r: 6, 
                    strokeWidth: 2,
                    stroke: 'hsl(var(--background))'
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
