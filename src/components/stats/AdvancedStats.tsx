import { motion } from 'framer-motion';
import { Activity, Zap, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { GameStats } from '@/types/basketball';
import { calculateAdvancedStats, calculateRadarData, type AdvancedStats as AdvancedStatsType } from '@/utils/statsCalculations';

interface AdvancedStatsProps {
  games: GameStats[];
}

const chartConfig = {
  value: { label: 'Rating', color: 'hsl(var(--primary))' },
};

function StatDisplay({ 
  label, 
  value, 
  description, 
  icon: Icon,
  index,
  suffix = '',
  decimals = 1,
}: { 
  label: string; 
  value: number; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  index: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold">
                <AnimatedCounter value={value} decimals={decimals} suffix={suffix} delay={index * 0.05} />
              </p>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdvancedStats({ games }: AdvancedStatsProps) {
  const advancedStats = calculateAdvancedStats(games);
  const radarData = calculateRadarData(games);

  if (games.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Log games to see advanced analytics!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatDisplay
          label="True Shooting %"
          value={advancedStats.trueShootingPercentage}
          suffix="%"
          description="Accounts for 2PT, 3PT, and FT efficiency"
          icon={Target}
          index={0}
        />
        <StatDisplay
          label="Assist/Turnover Ratio"
          value={advancedStats.assistToTurnoverRatio}
          description="Higher is better ball security"
          icon={Zap}
          index={1}
        />
        <StatDisplay
          label="Points Responsibility"
          value={advancedStats.pointsResponsibility}
          description="Points + (Assists × 2) per game"
          icon={TrendingUp}
          index={2}
        />
        <StatDisplay
          label="Efficiency Rating"
          value={advancedStats.efficiencyRating}
          description="Combined positive/negative contributions"
          icon={Activity}
          index={3}
        />
        <StatDisplay
          label="Rebounds Per Game"
          value={advancedStats.reboundRate}
          description="Average rebounds per contest"
          icon={BarChart3}
          index={4}
        />
      </div>

      {/* Player Profile Radar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Player Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickCount={5}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${Math.round(value)}`, 'Rating']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Radar
                    name="Player"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {radarData.map((item, index) => (
                <div key={item.subject} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">{item.subject}</span>
                  <span className="font-medium">
                    <AnimatedCounter value={Math.round(item.value)} delay={0.3 + index * 0.05} />
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Efficiency Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              How These Stats Work
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">True Shooting %</p>
                <p>Points / (2 × (FGA + 0.44 × FTA)) × 100</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Efficiency Rating</p>
                <p>(PTS + REB + AST + STL + BLK - TO - Missed Shots) / Games</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Points Responsibility</p>
                <p>Direct scoring + points created through assists</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Player Profile</p>
                <p>Skills normalized to youth basketball averages (0-100 scale)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
