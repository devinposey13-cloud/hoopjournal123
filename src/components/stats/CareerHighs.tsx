import { motion } from 'framer-motion';
import { Trophy, Flame, Target, Repeat, Shield, Zap, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { GameStats } from '@/types/basketball';
import { calculateCareerHighs, type CareerHigh } from '@/utils/statsCalculations';

interface CareerHighsProps {
  games: GameStats[];
}

const statIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Points: Flame,
  Assists: Target,
  Rebounds: Repeat,
  Steals: Shield,
  Blocks: Shield,
  'FG%': Target,
  'FT%': Target,
  'Game Score': Star,
  Efficiency: TrendingUp,
};

// All possible career high categories for empty state placeholders
const allCategories = [
  { stat: 'Points', icon: '🔥' },
  { stat: 'Assists', icon: '🎯' },
  { stat: 'Rebounds', icon: '💪' },
  { stat: 'Steals', icon: '🔒' },
  { stat: 'Blocks', icon: '🛡️' },
  { stat: 'FG%', icon: '🏀' },
  { stat: 'FT%', icon: '🎯' },
  { stat: 'Game Score', icon: '⭐' },
  { stat: 'Efficiency', icon: '📈' },
];

export function CareerHighs({ games }: CareerHighsProps) {
  const navigate = useNavigate();
  const careerHighs = calculateCareerHighs(games);

  // Find most recent career high
  const mostRecent = careerHighs.length > 0
    ? [...careerHighs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  if (games.length === 0) {
    return (
      <Card className="text-center py-12 border-border/50 bg-card/50">
        <CardContent>
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Career Highs Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Start logging games to build your personal record book.
          </p>
          <button
            onClick={() => navigate('/log')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Log Your First Game
          </button>
        </CardContent>
      </Card>
    );
  }

  // Build a map for easy lookup
  const highMap = new Map(careerHighs.map(h => [h.stat, h]));

  return (
    <div className="space-y-5">
      {/* Latest Personal Best - Featured Card */}
      {mostRecent && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/15 to-transparent" />
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/30 font-semibold">
                  Latest Personal Best
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{mostRecent.stat}</p>
                  <p className="text-3xl font-black text-primary">{mostRecent.displayValue}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs {mostRecent.opponent} • {format(new Date(mostRecent.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-4xl opacity-60">{mostRecent.icon}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Career Highs Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {allCategories.map((cat, index) => {
          const high = highMap.get(cat.stat);
          const isHighlight = cat.stat === 'Points' || cat.stat === 'Game Score' || cat.stat === 'Efficiency';

          return (
            <motion.div
              key={cat.stat}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className={`relative overflow-hidden h-full transition-all hover:shadow-md ${
                high && isHighlight
                  ? 'border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb,255,107,0),0.08)]'
                  : 'border-border/50'
              }`}>
                <CardContent className="p-4">
                  {high ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{cat.icon}</span>
                        {isHighlight && (
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {cat.stat}
                      </p>
                      <p className={`text-2xl font-black ${isHighlight ? 'text-primary' : 'text-foreground'}`}>
                        {high.displayValue}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
                        vs {high.opponent}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(high.date), 'MMM d, yyyy')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mb-2">
                        <span className="text-lg opacity-40">{cat.icon}</span>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {cat.stat}
                      </p>
                      <p className="text-2xl font-black text-muted-foreground/30">—</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        Log games to set your record
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
