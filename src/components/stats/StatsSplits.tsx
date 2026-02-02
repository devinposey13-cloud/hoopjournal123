import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, TrendingUp, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { GameStats } from '@/types/basketball';
import { calculateOpponentSplits, calculateMonthSplits, calculateWinLossSplits, type StatSplit } from '@/utils/statsCalculations';

interface StatsSplitsProps {
  games: GameStats[];
}

function SplitCard({ split, index }: { split: StatSplit; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm truncate flex-1">{split.label}</h3>
            <Badge variant="outline" className="ml-2 shrink-0">
              {split.gamesPlayed} {split.gamesPlayed === 1 ? 'game' : 'games'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
            <div className="text-center">
              <p className="font-bold text-lg">{split.avgPoints}</p>
              <p className="text-xs text-muted-foreground">PPG</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{split.avgRebounds}</p>
              <p className="text-xs text-muted-foreground">RPG</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{split.avgAssists}</p>
              <p className="text-xs text-muted-foreground">APG</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{split.winPercentage}%</span>
            </div>
            <Progress value={split.winPercentage} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatsSplits({ games }: StatsSplitsProps) {
  const [activeTab, setActiveTab] = useState('winloss');
  
  const winLossSplits = calculateWinLossSplits(games);
  const opponentSplits = calculateOpponentSplits(games);
  const monthSplits = calculateMonthSplits(games);

  if (games.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Log games to see performance splits!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="winloss" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Win/Loss</span>
          </TabsTrigger>
          <TabsTrigger value="opponent" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Opponent</span>
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">By Month</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="winloss" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {winLossSplits.wins.gamesPlayed > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-green-600 dark:text-green-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        In Wins
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.wins.avgPoints}</p>
                          <p className="text-xs text-muted-foreground">PPG</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.wins.avgRebounds}</p>
                          <p className="text-xs text-muted-foreground">RPG</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.wins.avgAssists}</p>
                          <p className="text-xs text-muted-foreground">APG</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="font-medium">{winLossSplits.wins.fgPercentage}%</p>
                          <p className="text-xs text-muted-foreground">FG%</p>
                        </div>
                        <div>
                          <p className="font-medium">{winLossSplits.wins.threePtPercentage}%</p>
                          <p className="text-xs text-muted-foreground">3P%</p>
                        </div>
                        <div>
                          <p className="font-medium">{winLossSplits.wins.ftPercentage}%</p>
                          <p className="text-xs text-muted-foreground">FT%</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="mt-4">
                        {winLossSplits.wins.gamesPlayed} games
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {winLossSplits.losses.gamesPlayed > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-destructive flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        In Losses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.losses.avgPoints}</p>
                          <p className="text-xs text-muted-foreground">PPG</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.losses.avgRebounds}</p>
                          <p className="text-xs text-muted-foreground">RPG</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{winLossSplits.losses.avgAssists}</p>
                          <p className="text-xs text-muted-foreground">APG</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="font-medium">{winLossSplits.losses.fgPercentage}%</p>
                          <p className="text-xs text-muted-foreground">FG%</p>
                        </div>
                        <div>
                          <p className="font-medium">{winLossSplits.losses.threePtPercentage}%</p>
                          <p className="text-xs text-muted-foreground">3P%</p>
                        </div>
                        <div>
                          <p className="font-medium">{winLossSplits.losses.ftPercentage}%</p>
                          <p className="text-xs text-muted-foreground">FT%</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="mt-4">
                        {winLossSplits.losses.gamesPlayed} games
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="opponent" className="mt-4">
            {opponentSplits.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">Play more games to see opponent splits!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {opponentSplits.map((split, index) => (
                  <SplitCard key={split.label} split={split} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="month" className="mt-4">
            {monthSplits.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">Log games to see monthly trends!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthSplits.map((split, index) => (
                  <SplitCard key={split.label} split={split} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
