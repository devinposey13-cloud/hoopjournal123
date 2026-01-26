import { GameStats } from '@/types/basketball';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';

interface StatsChartProps {
  games: GameStats[];
  stat: 'points' | 'rebounds' | 'assists';
}

export function StatsChart({ games, stat }: StatsChartProps) {
  const sortedGames = [...games]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10);

  const data = sortedGames.map((game) => ({
    date: format(new Date(game.date), 'MMM d'),
    value: game[stat],
    opponent: game.opponent,
  }));

  const statLabels = {
    points: 'Points',
    rebounds: 'Rebounds',
    assists: 'Assists',
  };

  return (
    <div className="stat-card h-[280px]">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        {statLabels[stat]} Trend
      </h3>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
          No games recorded yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: number, name: string, props: any) => [
                value,
                `vs ${props.payload.opponent}`,
              ]}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
