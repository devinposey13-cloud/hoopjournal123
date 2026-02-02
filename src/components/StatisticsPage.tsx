import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Trophy, GitBranch, Activity, Users, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SeasonOverview } from '@/components/stats/SeasonOverview';
import { CareerHighs } from '@/components/stats/CareerHighs';
import { StatsSplits } from '@/components/stats/StatsSplits';
import { AdvancedStats } from '@/components/stats/AdvancedStats';
import type { GameStats, SeasonStats, PlayerTeam } from '@/types/basketball';

export type StatsSubTab = 'overview' | 'highs' | 'splits' | 'efficiency';

interface StatisticsPageProps {
  games: GameStats[];
  seasonStats: SeasonStats;
  teams: PlayerTeam[];
}

export function StatisticsPage({ games, seasonStats, teams }: StatisticsPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<StatsSubTab>('overview');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Filter games by team
  const filteredGames = teamFilter === 'all'
    ? games
    : games.filter(g =>
        teamFilter === 'unassigned'
          ? !g.teamId
          : g.teamId === teamFilter
      );

  // Calculate filtered stats
  const calculateFilteredStats = (gamesList: GameStats[]): SeasonStats => {
    if (gamesList.length === 0) {
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        avgPoints: 0,
        avgRebounds: 0,
        avgAssists: 0,
        avgSteals: 0,
        avgBlocks: 0,
        fgPercentage: 0,
        threePtPercentage: 0,
        ftPercentage: 0,
      };
    }

    const totals = gamesList.reduce(
      (acc, game) => ({
        points: acc.points + game.points,
        rebounds: acc.rebounds + game.rebounds,
        assists: acc.assists + game.assists,
        steals: acc.steals + game.steals,
        blocks: acc.blocks + game.blocks,
        fgMade: acc.fgMade + game.fgMade,
        fgAttempted: acc.fgAttempted + game.fgAttempted,
        threePtMade: acc.threePtMade + game.threePtMade,
        threePtAttempted: acc.threePtAttempted + game.threePtAttempted,
        ftMade: acc.ftMade + game.ftMade,
        ftAttempted: acc.ftAttempted + game.ftAttempted,
        wins: acc.wins + (game.isWin ? 1 : 0),
      }),
      {
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
        fgMade: 0, fgAttempted: 0, threePtMade: 0, threePtAttempted: 0,
        ftMade: 0, ftAttempted: 0, wins: 0,
      }
    );

    const n = gamesList.length;
    return {
      gamesPlayed: n,
      wins: totals.wins,
      losses: n - totals.wins,
      avgPoints: Math.round((totals.points / n) * 10) / 10,
      avgRebounds: Math.round((totals.rebounds / n) * 10) / 10,
      avgAssists: Math.round((totals.assists / n) * 10) / 10,
      avgSteals: Math.round((totals.steals / n) * 10) / 10,
      avgBlocks: Math.round((totals.blocks / n) * 10) / 10,
      fgPercentage: totals.fgAttempted > 0
        ? Math.round((totals.fgMade / totals.fgAttempted) * 1000) / 10
        : 0,
      threePtPercentage: totals.threePtAttempted > 0
        ? Math.round((totals.threePtMade / totals.threePtAttempted) * 1000) / 10
        : 0,
      ftPercentage: totals.ftAttempted > 0
        ? Math.round((totals.ftMade / totals.ftAttempted) * 1000) / 10
        : 0,
    };
  };

  const displayStats = teamFilter === 'all' ? seasonStats : calculateFilteredStats(filteredGames);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Statistics
          </h1>
          <p className="text-muted-foreground">
            Dive deep into your performance
            {teamFilter !== 'all' && ` • ${teams.find(t => t.id === teamFilter)?.name || 'Unassigned'}`}
          </p>
        </div>
        
        {/* Team Filter */}
        {teams.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[160px]">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            {teamFilter !== 'all' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTeamFilter('all')}
                className="h-9 w-9"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as StatsSubTab)}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="highs" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Highs</span>
          </TabsTrigger>
          <TabsTrigger value="splits" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Splits</span>
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="overview" className="mt-6">
              <SeasonOverview games={filteredGames} seasonStats={displayStats} />
            </TabsContent>

            <TabsContent value="highs" className="mt-6">
              <CareerHighs games={filteredGames} />
            </TabsContent>

            <TabsContent value="splits" className="mt-6">
              <StatsSplits games={filteredGames} />
            </TabsContent>

            <TabsContent value="efficiency" className="mt-6">
              <AdvancedStats games={filteredGames} />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
