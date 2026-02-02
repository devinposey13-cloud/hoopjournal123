import { motion } from 'framer-motion';
import { Trophy, Target, Repeat, Zap, Shield, HandMetal, Star, CircleDot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { GameStats } from '@/types/basketball';
import { calculateCareerHighs, findPerfectGames, type CareerHigh } from '@/utils/statsCalculations';

interface CareerHighsProps {
  games: GameStats[];
}

const statIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Points: Target,
  Rebounds: Repeat,
  Assists: Zap,
  Steals: Shield,
  Blocks: HandMetal,
  '3-Pointers Made': CircleDot,
  'Free Throws Made': CircleDot,
};

export function CareerHighs({ games }: CareerHighsProps) {
  const careerHighs = calculateCareerHighs(games);
  const perfectGames = findPerfectGames(games);

  if (games.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Log games to see your career highs!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Career Highs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {careerHighs.map((high, index) => {
          const Icon = statIcons[high.stat] || Trophy;
          return (
            <motion.div
              key={high.stat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="relative overflow-hidden hover:shadow-lg transition-all group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{high.stat}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold text-primary">{high.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">vs {high.opponent}</p>
                      <Badge variant="secondary" className="mt-2">
                        {format(new Date(high.date), 'MMM d, yyyy')}
                      </Badge>
                    </div>
                    <Trophy className="h-8 w-8 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Perfect Games Section */}
      {perfectGames.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Perfect Games</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {perfectGames.map(({ type, games: perfectGamesList }) => (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{type}</p>
                      <Badge variant="outline">{perfectGamesList.length} game{perfectGamesList.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perfectGamesList.slice(0, 5).map((game) => (
                        <Badge key={game.id} variant="secondary" className="text-xs">
                          vs {game.opponent} • {format(new Date(game.date), 'MMM d')}
                        </Badge>
                      ))}
                      {perfectGamesList.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{perfectGamesList.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Career Highs Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-amber-500/10 via-background to-primary/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="h-10 w-10 mx-auto text-amber-500 mb-3" />
              <h3 className="font-semibold text-lg mb-1">Season Stats</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {games.length} games logged this season
              </p>
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <p className="font-bold text-2xl text-primary">
                    {games.filter(g => g.isWin).length}
                  </p>
                  <p className="text-muted-foreground">Wins</p>
                </div>
                <div className="border-l border-border" />
                <div>
                  <p className="font-bold text-2xl text-destructive">
                    {games.filter(g => !g.isWin).length}
                  </p>
                  <p className="text-muted-foreground">Losses</p>
                </div>
                <div className="border-l border-border" />
                <div>
                  <p className="font-bold text-2xl">
                    {games.length > 0 ? Math.round((games.filter(g => g.isWin).length / games.length) * 100) : 0}%
                  </p>
                  <p className="text-muted-foreground">Win Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
