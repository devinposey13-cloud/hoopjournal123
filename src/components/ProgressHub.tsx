import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Video, Trophy, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickStatsRow } from '@/components/progress/QuickStatsRow';
import { AIInsightsPanel } from '@/components/progress/AIInsightsPanel';
import { HeroPerformanceChart } from '@/components/progress/HeroPerformanceChart';
import { useXpProgress } from '@/hooks/useXpProgress';
import type { GameStats, SeasonStats, PlayerTeam, VideoClip } from '@/types/basketball';

// Lazy load heavy components for better performance
const StatisticsPage = lazy(() => import('@/components/StatisticsPage').then(m => ({ default: m.StatisticsPage })));
const MilestoneCollection = lazy(() => import('@/components/milestones/MilestoneCollection').then(m => ({ default: m.MilestoneCollection })));
const SeasonOverview = lazy(() => import('@/components/stats/SeasonOverview').then(m => ({ default: m.SeasonOverview })));
const CareerHighs = lazy(() => import('@/components/stats/CareerHighs').then(m => ({ default: m.CareerHighs })));
const StatsChart = lazy(() => import('@/components/StatsChart').then(m => ({ default: m.StatsChart })));
const ClipCard = lazy(() => import('@/components/ClipCard').then(m => ({ default: m.ClipCard })));
const AddClipDialog = lazy(() => import('@/components/AddClipDialog').then(m => ({ default: m.AddClipDialog })));
const ExploreClips = lazy(() => import('@/components/ExploreClips').then(m => ({ default: m.ExploreClips })));

export type ProgressSubTab = 'overview' | 'stats' | 'trends' | 'clips' | 'achievements';

interface ProgressHubProps {
  games: GameStats[];
  clips: VideoClip[];
  seasonStats: SeasonStats;
  teams: PlayerTeam[];
  isMobile: boolean;
  addClip: (file: File, title: string, description?: string, isPublic?: boolean) => Promise<any>;
  deleteClip: (id: string) => Promise<void>;
  initialSubTab?: ProgressSubTab;
  onSubTabChange?: (subTab: ProgressSubTab) => void;
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProgressHub({
  games,
  clips,
  seasonStats,
  teams,
  isMobile,
  addClip,
  deleteClip,
  initialSubTab = 'overview',
  onSubTabChange,
}: ProgressHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<ProgressSubTab>(initialSubTab);
  const { progress: xpProgress } = useXpProgress();

  // Sync with URL when initialSubTab changes
  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const handleSubTabChange = (value: string) => {
    const newTab = value as ProgressSubTab;
    setActiveSubTab(newTab);
    onSubTabChange?.(newTab);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Compact */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progress
        </h1>
        <p className="text-sm text-muted-foreground">
          Your performance analytics hub
        </p>
      </div>

      {/* Quick Stats Row - Horizontally scrollable */}
      <QuickStatsRow 
        games={games} 
        seasonStats={seasonStats} 
        xpProgress={xpProgress}
      />

      {/* AI Insights - Priority placement */}
      <AIInsightsPanel games={games} seasonStats={seasonStats} />

      {/* Hero Performance Chart */}
      <HeroPerformanceChart games={games} />

      {/* Sub-Tabs Navigation */}
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="overview" 
            className="gap-1.5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Overview</span>
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="gap-1.5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Stats</span>
          </TabsTrigger>
          <TabsTrigger 
            value="trends" 
            className="gap-1.5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Trends</span>
          </TabsTrigger>
          <TabsTrigger 
            value="clips" 
            className="gap-1.5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Clips</span>
          </TabsTrigger>
          <TabsTrigger 
            value="achievements" 
            className="gap-1.5 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Achievements</span>
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
            {/* Overview Tab - Quick snapshot with career highlights */}
            <TabsContent value="overview" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <ProgressOverview games={games} seasonStats={seasonStats} />
              </Suspense>
            </TabsContent>

            {/* Stats Tab - Full statistics page */}
            <TabsContent value="stats" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <StatisticsPage games={games} seasonStats={seasonStats} teams={teams} />
              </Suspense>
            </TabsContent>

            {/* Trends Tab - Performance charts */}
            <TabsContent value="trends" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <ProgressTrends games={games} />
              </Suspense>
            </TabsContent>

            {/* Clips Tab - Video highlights */}
            <TabsContent value="clips" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <ProgressClips 
                  clips={clips} 
                  isMobile={isMobile}
                  addClip={addClip}
                  deleteClip={deleteClip}
                />
              </Suspense>
            </TabsContent>

            {/* Achievements Tab - Milestones */}
            <TabsContent value="achievements" className="mt-6">
              <Suspense fallback={<TabSkeleton />}>
                <MilestoneCollection />
              </Suspense>
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

// Sub-components

interface ProgressOverviewProps {
  games: GameStats[];
  seasonStats: SeasonStats;
}

function ProgressOverview({ games, seasonStats }: ProgressOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Career Highs - Featured prominently */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Career Highlights
        </h3>
        <Suspense fallback={<TabSkeleton />}>
          <CareerHighs games={games} />
        </Suspense>
      </div>
      
      {/* Season Overview - Below career highs */}
      <Suspense fallback={<TabSkeleton />}>
        <SeasonOverview games={games} seasonStats={seasonStats} />
      </Suspense>
    </div>
  );
}

interface ProgressTrendsProps {
  games: GameStats[];
}

function ProgressTrends({ games }: ProgressTrendsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Detailed Trends</h3>
        <p className="text-muted-foreground text-sm">
          Individual stat breakdowns over your last 10 games
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <Suspense fallback={<Skeleton className="h-[280px] rounded-xl" />}>
          <div className="stat-card p-4 rounded-xl">
            <StatsChart games={games} stat="points" />
          </div>
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[280px] rounded-xl" />}>
          <div className="stat-card p-4 rounded-xl">
            <StatsChart games={games} stat="rebounds" />
          </div>
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[280px] rounded-xl" />}>
          <div className="stat-card p-4 rounded-xl">
            <StatsChart games={games} stat="assists" />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

interface ProgressClipsProps {
  clips: VideoClip[];
  isMobile: boolean;
  addClip: (file: File, title: string, description?: string, isPublic?: boolean) => Promise<any>;
  deleteClip: (id: string) => Promise<void>;
}

function ProgressClips({ clips, isMobile, addClip, deleteClip }: ProgressClipsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Video Clips</h3>
          <p className="text-muted-foreground text-sm">
            {clips.length} clips uploaded
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-9 w-24" />}>
          <AddClipDialog onAddClip={addClip} isMobile={isMobile} />
        </Suspense>
      </div>

      <Tabs defaultValue="my-clips" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-clips">My Clips</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-clips" className="mt-6">
          {clips.length === 0 ? (
            <div className="stat-card text-center py-16 rounded-xl">
              <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-lg">No clips uploaded yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload your best plays and highlights!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Suspense fallback={<Skeleton className="aspect-video rounded-lg" />}>
                {clips.map((clip) => (
                  <ClipCard key={clip.id} clip={clip} onDelete={deleteClip} />
                ))}
              </Suspense>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="explore" className="mt-6">
          <Suspense fallback={<TabSkeleton />}>
            <ExploreClips />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
