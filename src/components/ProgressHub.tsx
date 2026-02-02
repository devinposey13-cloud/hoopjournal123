import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Video, Trophy, Activity } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatisticsPage } from '@/components/StatisticsPage';
import { MilestoneCollection } from '@/components/milestones/MilestoneCollection';
import { StatsChart } from '@/components/StatsChart';
import { ClipCard } from '@/components/ClipCard';
import { AddClipDialog } from '@/components/AddClipDialog';
import { ExploreClips } from '@/components/ExploreClips';
import { SeasonOverview } from '@/components/stats/SeasonOverview';
import { CareerHighs } from '@/components/stats/CareerHighs';
import type { GameStats, SeasonStats, PlayerTeam, VideoClip } from '@/types/basketball';

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Progress
        </h1>
        <p className="text-muted-foreground">
          Your complete performance analytics center
        </p>
      </div>

      {/* Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="clips" className="gap-1.5">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Clips</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1.5">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
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
            {/* Overview Tab - Quick snapshot */}
            <TabsContent value="overview" className="mt-6">
              <ProgressOverview games={games} seasonStats={seasonStats} />
            </TabsContent>

            {/* Stats Tab - Full statistics page */}
            <TabsContent value="stats" className="mt-6">
              <StatisticsPage games={games} seasonStats={seasonStats} teams={teams} />
            </TabsContent>

            {/* Trends Tab - Performance charts */}
            <TabsContent value="trends" className="mt-6">
              <ProgressTrends games={games} />
            </TabsContent>

            {/* Clips Tab - Video highlights */}
            <TabsContent value="clips" className="mt-6">
              <ProgressClips 
                clips={clips} 
                isMobile={isMobile}
                addClip={addClip}
                deleteClip={deleteClip}
              />
            </TabsContent>

            {/* Achievements Tab - Milestones */}
            <TabsContent value="achievements" className="mt-6">
              <MilestoneCollection />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

// Sub-components to keep ProgressHub clean

interface ProgressOverviewProps {
  games: GameStats[];
  seasonStats: SeasonStats;
}

function ProgressOverview({ games, seasonStats }: ProgressOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Season Overview - reusing existing component */}
      <SeasonOverview games={games} seasonStats={seasonStats} />
      
      {/* Career Highs Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Career Highlights</h3>
        <CareerHighs games={games} />
      </div>
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
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Track your progression over your last 10 games
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="stat-card p-4 rounded-xl">
          <StatsChart games={games} stat="points" />
        </div>
        <div className="stat-card p-4 rounded-xl">
          <StatsChart games={games} stat="rebounds" />
        </div>
        <div className="stat-card p-4 rounded-xl">
          <StatsChart games={games} stat="assists" />
        </div>
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
        <AddClipDialog onAddClip={addClip} isMobile={isMobile} />
      </div>

      <Tabs defaultValue="my-clips" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-clips">My Clips</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-clips" className="mt-6">
          {clips.length === 0 ? (
            <div className="stat-card text-center py-16">
              <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground text-lg">No clips uploaded yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload your best plays and highlights!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} onDelete={deleteClip} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="explore" className="mt-6">
          <ExploreClips />
        </TabsContent>
      </Tabs>
    </div>
  );
}
