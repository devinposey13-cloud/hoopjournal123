import { useState, useMemo } from 'react';
import { Trophy, Lock, TrendingUp, Crown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MilestoneCard } from './MilestoneCard';
import { MonthlyChallenges } from './MonthlyChallenges';
import { QuarterlyProgress } from '@/components/xp/QuarterlyProgress';
import { useMilestones } from '@/hooks/useMilestones';
import { useCloudData } from '@/hooks/useCloudData';
import { useXpProgress } from '@/hooks/useXpProgress';
import type { MilestoneCategory, MilestoneRarity } from '@/types/milestone';
import { cn } from '@/lib/utils';

type FilterCategory = 'all' | MilestoneCategory;

export function MilestoneCollection() {
  const { games, activeSeason } = useCloudData();
  const { 
    definitions, 
    earnedMilestones, 
    loading, 
    getSeasonProgress,
    getOccurrencesByMilestoneId,
  } = useMilestones(activeSeason?.id);
  const { progress: xpProgress, quarterInfo: xpQuarterInfo, loading: xpLoading } = useXpProgress();

  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [showEarned, setShowEarned] = useState<'all' | 'earned' | 'locked'>('all');

  // Map games for milestone checking
  const gamesWithIds = useMemo(() => 
    games.map(g => ({ ...g, id: g.id || '' })).filter(g => g.id),
    [games]
  );

  // Create lookup map for games by ID for O(1) opponent lookup
  const gamesMap = useMemo(() => {
    const map = new Map<string, { opponent: string }>();
    games.forEach(g => {
      if (g.id) map.set(g.id, { opponent: g.opponent });
    });
    return map;
  }, [games]);

  // Get season progress for cumulative milestones
  const seasonProgress = useMemo(() => 
    getSeasonProgress(gamesWithIds),
    [getSeasonProgress, gamesWithIds]
  );

  // Group earned milestones by milestone id for quick lookup (first occurrence for display)
  const earnedMap = useMemo(() => {
    const map = new Map<string, typeof earnedMilestones[0]>();
    // Use first occurrence (most recent) for display
    earnedMilestones.forEach(em => {
      if (!map.has(em.milestoneId)) {
        map.set(em.milestoneId, em);
      }
    });
    return map;
  }, [earnedMilestones]);

  // Filter and organize milestones
  const filteredDefinitions = useMemo(() => {
    let filtered = definitions;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(d => d.category === categoryFilter);
    }

    if (showEarned === 'earned') {
      filtered = filtered.filter(d => earnedMap.has(d.id));
    } else if (showEarned === 'locked') {
      filtered = filtered.filter(d => !earnedMap.has(d.id));
    }

    // Sort by rarity (legendary first)
    const rarityOrder: Record<MilestoneRarity, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      uncommon: 3,
      common: 4,
    };

    return filtered.sort((a, b) => {
      // Earned first, then by rarity
      const aEarned = earnedMap.has(a.id) ? 0 : 1;
      const bEarned = earnedMap.has(b.id) ? 0 : 1;
      if (aEarned !== bEarned) return aEarned - bEarned;
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [definitions, categoryFilter, showEarned, earnedMap]);

  // Stats
  const totalEarned = new Set(earnedMilestones.map(m => m.milestoneId)).size;
  const totalAvailable = definitions.length;

  if (loading || xpLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ring of Honor Link */}
      <Link 
        to="/ring-of-honor"
        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ring of Honor</h3>
            <p className="text-sm text-muted-foreground">View the legends who reached Level 50</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
      </Link>

      {/* XP Progress Section */}
      {xpQuarterInfo && (
        <QuarterlyProgress progress={xpProgress} quarterInfo={xpQuarterInfo} />
      )}

      {/* Monthly Challenges Section */}
      <MonthlyChallenges />

      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Milestones</h2>
            <p className="text-sm text-muted-foreground">
              {totalEarned} of {totalAvailable} earned
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{totalEarned}</div>
          <div className="text-xs text-muted-foreground">Total Earned</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Collection Progress</span>
          <span className="font-medium">{Math.round((totalEarned / totalAvailable) * 100)}%</span>
        </div>
        <Progress value={(totalEarned / totalAvailable) * 100} className="h-2" />
      </div>

      {/* Season Progress Section */}
      {seasonProgress.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium">Season Progress</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {seasonProgress
              .filter(p => !p.isEarned && p.progress > 0)
              .slice(0, 4)
              .map(p => (
                <div key={p.milestone.id} className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{p.milestone.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.current}/{p.target}
                    </span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="all" onClick={() => setCategoryFilter('all')}>
            All
          </TabsTrigger>
          <TabsTrigger value="single_game" onClick={() => setCategoryFilter('single_game')}>
            Single Game
          </TabsTrigger>
          <TabsTrigger value="multi_game" onClick={() => setCategoryFilter('multi_game')}>
            Streaks
          </TabsTrigger>
          <TabsTrigger value="season" onClick={() => setCategoryFilter('season')}>
            Season
          </TabsTrigger>
        </TabsList>

        {/* Earned/Locked filter */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={showEarned === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowEarned('all')}
          >
            All
          </Button>
          <Button
            variant={showEarned === 'earned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowEarned('earned')}
          >
            <Trophy className="w-3 h-3 mr-1" />
            Earned
          </Button>
          <Button
            variant={showEarned === 'locked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowEarned('locked')}
          >
            <Lock className="w-3 h-3 mr-1" />
            Locked
          </Button>
        </div>

        {/* Milestone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDefinitions.map(def => {
            const firstEarned = earnedMap.get(def.id);
            const allOccurrences = getOccurrencesByMilestoneId.get(def.id) || [];
            const count = allOccurrences.length;
            
            // Look up actual game data if milestone has a gameId
            const linkedGame = firstEarned?.gameId ? gamesMap.get(firstEarned.gameId) : undefined;
            
            return (
              <MilestoneCard
                key={def.id}
                milestone={def}
                earnedAt={firstEarned?.earnedAt}
                statsSnapshot={firstEarned?.statsSnapshot}
                gameOpponent={linkedGame?.opponent}
                isEarned={!!firstEarned}
                isLocked={!firstEarned}
                allOccurrences={allOccurrences}
                gamesMap={gamesMap}
                showFlipHint={count > 1}
                occurrenceCount={count}
              />
            );
          })}
        </div>

        {filteredDefinitions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No milestones found with current filters</p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
