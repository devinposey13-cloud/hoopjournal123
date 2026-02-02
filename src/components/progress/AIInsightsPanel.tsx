import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Target, Zap, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { GameStats, SeasonStats } from '@/types/basketball';

interface AIInsightsPanelProps {
  games: GameStats[];
  seasonStats: SeasonStats;
}

interface Insight {
  text: string;
  type: 'positive' | 'neutral' | 'improvement';
  icon: React.ReactNode;
}

function generateInsights(games: GameStats[], seasonStats: SeasonStats): Insight[] {
  const insights: Insight[] = [];
  
  if (games.length < 2) {
    return [{
      text: "Log more games to unlock personalized insights",
      type: 'neutral',
      icon: <Sparkles className="h-4 w-4" />
    }];
  }
  
  const sortedGames = [...games].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Last 5 games vs previous 5
  const last5 = sortedGames.slice(0, 5);
  const prev5 = sortedGames.slice(5, 10);
  
  if (last5.length >= 3 && prev5.length >= 3) {
    const last5Avg = last5.reduce((a, g) => a + g.points, 0) / last5.length;
    const prev5Avg = prev5.reduce((a, g) => a + g.points, 0) / prev5.length;
    const diff = Math.round((last5Avg - prev5Avg) * 10) / 10;
    
    if (diff > 2) {
      insights.push({
        text: `Scoring is up ${diff.toFixed(1)} points in your last 5 games`,
        type: 'positive',
        icon: <TrendingUp className="h-4 w-4" />
      });
    } else if (diff < -2) {
      insights.push({
        text: `Scoring dropped ${Math.abs(diff).toFixed(1)} points recently - time to attack`,
        type: 'improvement',
        icon: <Target className="h-4 w-4" />
      });
    }
  }
  
  // Turnover trend
  if (last5.length >= 3 && prev5.length >= 3) {
    const last5TO = last5.reduce((a, g) => a + g.turnovers, 0) / last5.length;
    const prev5TO = prev5.reduce((a, g) => a + g.turnovers, 0) / prev5.length;
    const toDiff = Math.round((prev5TO - last5TO) * 10) / 10;
    
    if (toDiff > 0.5) {
      insights.push({
        text: `Turnovers down ${Math.round(toDiff * 10) / 10}/game - great ball security`,
        type: 'positive',
        icon: <Shield className="h-4 w-4" />
      });
    }
  }
  
  // Win streak detection
  let currentStreak = 0;
  for (const game of sortedGames) {
    if (game.isWin) currentStreak++;
    else break;
  }
  
  if (currentStreak >= 3) {
    insights.push({
      text: `You're on a ${currentStreak}-game winning streak 🔥`,
      type: 'positive',
      icon: <Zap className="h-4 w-4" />
    });
  }
  
  // FG% insight
  if (seasonStats.fgPercentage > 50) {
    insights.push({
      text: `Shooting ${seasonStats.fgPercentage.toFixed(0)}% from the field - elite efficiency`,
      type: 'positive',
      icon: <Target className="h-4 w-4" />
    });
  } else if (seasonStats.fgPercentage < 40 && games.length >= 5) {
    insights.push({
      text: `Focus on high-percentage shots to improve your ${seasonStats.fgPercentage.toFixed(0)}% FG`,
      type: 'improvement',
      icon: <Target className="h-4 w-4" />
    });
  }
  
  // Assist trend
  if (last5.length >= 3) {
    const last5Ast = last5.reduce((a, g) => a + g.assists, 0) / last5.length;
    if (last5Ast >= 5) {
      insights.push({
        text: `Averaging ${last5Ast.toFixed(1)} assists lately - great floor vision`,
        type: 'positive',
        icon: <Zap className="h-4 w-4" />
      });
    }
  }
  
  // Win rate in home/away (if applicable)
  const wins = games.filter(g => g.isWin);
  const winRate = games.length > 0 ? Math.round((wins.length / games.length) * 100) : 0;
  
  if (winRate >= 70 && games.length >= 5) {
    insights.push({
      text: `${winRate}% win rate this season - dominant performance`,
      type: 'positive',
      icon: <TrendingUp className="h-4 w-4" />
    });
  }
  
  // Return top 3 most relevant insights
  return insights.slice(0, 3);
}

export function AIInsightsPanel({ games, seasonStats }: AIInsightsPanelProps) {
  const insights = generateInsights(games, seasonStats);
  
  if (insights.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Performance Insights</h3>
          </div>
          
          <div className="space-y-2.5">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-2.5"
              >
                <div className={`p-1 rounded-md flex-shrink-0 ${
                  insight.type === 'positive' 
                    ? 'bg-green-500/10 text-green-600' 
                    : insight.type === 'improvement'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {insight.icon}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {insight.text}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
