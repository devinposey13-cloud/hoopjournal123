import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence } from 'framer-motion';
import { Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PlayerHeader } from '@/components/PlayerHeader';
import { StatCard } from '@/components/StatCard';
import { GameCard } from '@/components/GameCard';
import { ClipCard } from '@/components/ClipCard';
import { StatsChart } from '@/components/StatsChart';
import { AddGameDialog } from '@/components/AddGameDialog';
import { AddClipDialog } from '@/components/AddClipDialog';
import { AddScheduleDialog } from '@/components/AddScheduleDialog';
import { ScheduleCard } from '@/components/ScheduleCard';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { ImportScheduleDialog } from '@/components/ImportScheduleDialog';
import { CoachChat } from '@/components/CoachChat';
import { BasketballKnowledge } from '@/components/BasketballKnowledge';
import { PlayerComparison } from '@/components/PlayerComparison';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AuthForm } from '@/components/AuthForm';
import { ExploreClips } from '@/components/ExploreClips';
import { JournalHeader } from '@/components/JournalHeader';
import { AdminPanel } from '@/components/AdminPanel';
import { GamesHub } from '@/components/games/GamesHub';
import { MilestoneCollection } from '@/components/milestones/MilestoneCollection';
import { StatisticsPage } from '@/components/StatisticsPage';
import { PersistentMusicBar } from '@/components/PersistentMusicBar';
import { MilestoneReveal } from '@/components/milestones/MilestoneReveal';
import { PostGameXpReveal } from '@/components/xp/PostGameXpReveal';
import { LevelUpCelebration } from '@/components/xp/LevelUpCelebration';
import { TierCelebration } from '@/components/xp/TierCelebration';
import { QuarterlyProgress } from '@/components/xp/QuarterlyProgress';
import { XpProgressBar } from '@/components/xp/XpProgressBar';
import { DiamondLevelBadge } from '@/components/xp/DiamondLevelBadge';
import { RingOfHonorOptInModal } from '@/components/xp/RingOfHonorOptInModal';
import { RingOfHonorEligibilityBanner } from '@/components/xp/RingOfHonorEligibilityBanner';
import { getXpProgressInLevel } from '@/utils/xpCalculations';
import { useRingOfHonorEligibility } from '@/hooks/useRingOfHonorEligibility';
import { LiveStatCapture, LiveStatsSaveData } from '@/components/LiveStatCapture';
import { QuickLiveStatsDialog } from '@/components/QuickLiveStatsDialog';
import { PendingApproval } from '@/components/PendingApproval';
import { OnboardingFlow, OnboardingData } from '@/components/OnboardingFlow';
import { EmptyDashboardWelcome } from '@/components/EmptyDashboardWelcome';
import { useAuth } from '@/hooks/useAuth';
import { useGameWithMilestones } from '@/hooks/useGameWithMilestones';
import { useAdmin } from '@/hooks/useAdmin';
import { useApprovalStatus } from '@/hooks/useApprovalStatus';
import { useFirstLogin } from '@/hooks/useFirstLogin';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import { useRetroactiveXp } from '@/hooks/useRetroactiveXp';
import { isAfter, isBefore, isToday, startOfDay, isSameDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LogOut, Trophy, X, Radio, Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardSkeleton, GamesTabSkeleton, ScheduleTabSkeleton, MilestonesTabSkeleton, GamesHubTabSkeleton, CoachTabSkeleton, ClipsTabSkeleton, StatsTabSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnimatedContainer, AnimatedItem, AnimatedSection } from '@/components/ui/animated-container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Repeat,
  Zap,
  Shield,
  HandMetal,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const isMobile = useIsMobile();
  const [showQuickLiveStatsDialog, setShowQuickLiveStatsDialog] = useState(false);
  const [showQuickLiveCapture, setShowQuickLiveCapture] = useState(false);
  const [quickCaptureOpponent, setQuickCaptureOpponent] = useState('');
  const [quickCaptureScheduledGameId, setQuickCaptureScheduledGameId] = useState<string | undefined>();
  const [quickCaptureTeamId, setQuickCaptureTeamId] = useState<string | undefined>();
  const [isSavingQuickCapture, setIsSavingQuickCapture] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [dashboardTeamFilter, setDashboardTeamFilter] = useState<string>('all');
  const [gamesTabTeamFilter, setGamesTabTeamFilter] = useState<string>('all');
  const [justCompletedOnboarding, setJustCompletedOnboarding] = useState(false);
  const [showRingOfHonorModal, setShowRingOfHonorModal] = useState(false);
  const [hasShownRingOfHonorModal, setHasShownRingOfHonorModal] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const { teams } = usePlayerTeams();
  const { isAdmin } = useAdmin();
  const { isApproved, loading: approvalLoading, refetch: refetchApproval } = useApprovalStatus();
  const {
    games,
    clips,
    profile,
    schedule,
    seasons,
    activeSeason,
    loading: dataLoading,
    seasonStats,
    addGame,
    deleteGame,
    updateGameTeam,
    addClip,
    deleteClip,
    updateProfile,
    uploadAvatar,
    addScheduledGame,
    updateScheduledGame,
    deleteScheduledGame,
    bulkImportScheduledGames,
    createSeason,
    switchSeason,
    deleteSeason,
    // Milestone-related
    pendingMilestones,
    showReveal,
    closeReveal,
    // XP-related
    xpProgress,
    xpQuarterInfo,
    pendingXpResult,
    showXpReveal,
    closeXpReveal,
    showLevelUpCelebration,
    closeLevelUpCelebration,
    // Tier celebration
    pendingTierCelebration,
    showTierCelebration,
    closeTierCelebration,
    // Tier achievements for badges
    achievedTiers,
  } = useGameWithMilestones();

  // Check Ring of Honor eligibility
  const currentLevel = xpProgress?.current_level ?? 1;
  const ringOfHonorEligibility = useRingOfHonorEligibility(currentLevel);

  // Apply retroactive XP for games logged before XP system
  useRetroactiveXp();

  // Trigger Ring of Honor modal when user reaches Level 50 AND has opted in
  useEffect(() => {
    if (
      !ringOfHonorEligibility.loading &&
      ringOfHonorEligibility.isEligible &&
      !ringOfHonorEligibility.isAlreadyMember &&
      profile?.ringOfHonorOptIn &&  // Only show if user has opted in
      !hasShownRingOfHonorModal &&
      !showLevelUpCelebration // Wait for level up celebration to finish
    ) {
      // Small delay to let level up celebration play first
      const timer = setTimeout(() => {
        setShowRingOfHonorModal(true);
        setHasShownRingOfHonorModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    ringOfHonorEligibility.loading,
    ringOfHonorEligibility.isEligible,
    ringOfHonorEligibility.isAlreadyMember,
    profile?.ringOfHonorOptIn,
    hasShownRingOfHonorModal,
    showLevelUpCelebration,
  ]);

  // useFirstLogin now uses database as source of truth
  const { showOnboarding, loading: introLoading, completeOnboarding } = useFirstLogin({
    profile,
    profileLoading: dataLoading,
  });

  // Show auth form if not logged in
  if (authLoading || approvalLoading || introLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (!user) {
    return <AuthForm />;
  }

  // Show pending approval screen if not approved (admins bypass this)
  if (!isApproved && !isAdmin) {
    return <PendingApproval onRefresh={refetchApproval} />;
  }

  // Show onboarding flow after intro
  const handleOnboardingComplete = async (data: OnboardingData) => {
    // Save onboarding data to profile
    await updateProfile({
      name: data.name,
      courtRole: data.courtRole,
      playingLevel: data.playingLevel,
      seasonGoals: data.seasonGoals,
      parentEmail: data.parentEmail || undefined,
      onboardingCompletedAt: new Date().toISOString(),
    });
    // Mark that user just completed onboarding for Coach AI intro
    setJustCompletedOnboarding(true);
    completeOnboarding();
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const today = startOfDay(new Date());
  
  // Get unique tags for filter dropdown
  const tournaments = [...new Set(schedule.filter(g => g.tournament).map(g => g.tournament!))].sort();
  
  // Apply filters (team + tag) for schedule
  const filteredSchedule = schedule.filter(g => {
    const matchesTeam = teamFilter === 'all' || g.teamId === teamFilter || (!g.teamId && teamFilter === 'unassigned');
    const matchesTournament = tournamentFilter === 'all' || g.tournament === tournamentFilter;
    return matchesTeam && matchesTournament;
  });
  
  const upcomingGames = filteredSchedule.filter(
    (g) => isAfter(new Date(g.date), today) || isToday(new Date(g.date))
  );
  const pastScheduledGames = filteredSchedule.filter(
    (g) => isBefore(new Date(g.date), today) && !isToday(new Date(g.date))
  );
  
  // Get today's games specifically for Quick Live Stats
  const todayGames = schedule.filter((g) => isToday(new Date(g.date)));

  // Filter games for dashboard by team
  const dashboardFilteredGames = dashboardTeamFilter === 'all' 
    ? games 
    : games.filter(g => 
        dashboardTeamFilter === 'unassigned' 
          ? !g.teamId 
          : g.teamId === dashboardTeamFilter
      );

  // Calculate filtered stats for dashboard
  const calculateFilteredStats = (filteredGames: typeof games) => {
    if (filteredGames.length === 0) {
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

    const totals = filteredGames.reduce(
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

    const gamesPlayed = filteredGames.length;
    return {
      gamesPlayed,
      wins: totals.wins,
      losses: gamesPlayed - totals.wins,
      avgPoints: Math.round((totals.points / gamesPlayed) * 10) / 10,
      avgRebounds: Math.round((totals.rebounds / gamesPlayed) * 10) / 10,
      avgAssists: Math.round((totals.assists / gamesPlayed) * 10) / 10,
      avgSteals: Math.round((totals.steals / gamesPlayed) * 10) / 10,
      avgBlocks: Math.round((totals.blocks / gamesPlayed) * 10) / 10,
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

  const dashboardStats = dashboardTeamFilter === 'all' 
    ? seasonStats 
    : calculateFilteredStats(dashboardFilteredGames);

  // Helper to find a linked played game for a scheduled game
  const findLinkedGame = (scheduledGame: { opponent: string; date: string }) => {
    const scheduleDate = new Date(scheduledGame.date);
    return games.find((pg) => {
      const playedDate = new Date(pg.date);
      return (
        pg.opponent.toLowerCase() === scheduledGame.opponent.toLowerCase() &&
        isSameDay(scheduleDate, playedDate)
      );
    });
  };

  // Quick Live Stats handlers
  const handleQuickLiveStatsClick = () => {
    // If exactly one game today, go straight to capture
    if (todayGames.length === 1) {
      setQuickCaptureOpponent(todayGames[0].opponent);
      setQuickCaptureScheduledGameId(todayGames[0].id);
      setQuickCaptureTeamId(todayGames[0].teamId);
      setShowQuickLiveCapture(true);
    } else {
      // Otherwise show the dialog
      setShowQuickLiveStatsDialog(true);
    }
  };

  const handleStartQuickCapture = (opponent: string, scheduledGameId?: string, teamId?: string) => {
    setQuickCaptureOpponent(opponent);
    setQuickCaptureScheduledGameId(scheduledGameId);
    setQuickCaptureTeamId(teamId);
    setShowQuickLiveCapture(true);
  };

  const handleQuickCaptureSave = async (stats: any, halfData?: LiveStatsSaveData, isGameOver?: boolean) => {
    setIsSavingQuickCapture(true);
    try {
      const gameData = {
        date: format(new Date(), 'yyyy-MM-dd'),
        opponent: quickCaptureOpponent,
        points: halfData?.total.points ?? stats.points,
        rebounds: halfData?.total.rebounds ?? stats.rebounds,
        assists: halfData?.total.assists ?? stats.assists,
        steals: halfData?.total.steals ?? stats.steals,
        blocks: halfData?.total.blocks ?? stats.blocks,
        turnovers: halfData?.total.turnovers ?? stats.turnovers,
        fouls: halfData?.total.fouls ?? stats.fouls,
        minutesPlayed: 0,
        fgMade: halfData?.total.fgMade ?? stats.fgMade,
        fgAttempted: halfData?.total.fgAttempted ?? stats.fgAttempted,
        threePtMade: halfData?.total.threePtMade ?? stats.threePtMade,
        threePtAttempted: halfData?.total.threePtAttempted ?? stats.threePtAttempted,
        ftMade: halfData?.total.ftMade ?? stats.ftMade,
        ftAttempted: halfData?.total.ftAttempted ?? stats.ftAttempted,
        isWin: halfData?.isWin ?? false,
        offensiveRebounds: halfData?.total.offensiveRebounds ?? stats.offensiveRebounds,
        defensiveRebounds: halfData?.total.defensiveRebounds ?? stats.defensiveRebounds,
        gamePhotoUrl: halfData?.gamePhotoUrl,
        teamId: quickCaptureTeamId,
      };

      await addGame(gameData);
      toast.success('Game saved successfully!');
      setShowQuickLiveCapture(false);
      setQuickCaptureOpponent('');
      setQuickCaptureScheduledGameId(undefined);
      setQuickCaptureTeamId(undefined);
    } catch (error) {
      console.error('Error saving game:', error);
      toast.error('Failed to save game');
    } finally {
      setIsSavingQuickCapture(false);
    }
  };

  const handleQuickCaptureCancel = () => {
    setShowQuickLiveCapture(false);
    setQuickCaptureOpponent('');
    setQuickCaptureScheduledGameId(undefined);
    setQuickCaptureTeamId(undefined);
  };

  // Render skeleton based on active tab
  const renderLoadingSkeleton = () => {
    switch (activeTab) {
      case 'games':
        return <GamesTabSkeleton />;
      case 'stats':
        return <StatsTabSkeleton />;
      case 'schedule':
        return <ScheduleTabSkeleton />;
      case 'milestones':
        return <MilestonesTabSkeleton />;
      case 'minigames':
        return <GamesHubTabSkeleton />;
      case 'coach':
        return <CoachTabSkeleton />;
      case 'clips':
        return <ClipsTabSkeleton />;
      default:
        return <DashboardSkeleton />;
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="container mx-auto px-4 py-6">
          {renderLoadingSkeleton()}
        </main>
        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={switchSeason}
          onCreateSeason={async (name) => { await createSeason(name); }}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  // Show Quick Live Capture fullscreen mode
  if (showQuickLiveCapture) {
    return (
      <LiveStatCapture
        opponent={quickCaptureOpponent}
        onSave={handleQuickCaptureSave}
        onCancel={handleQuickCaptureCancel}
        isSaving={isSavingQuickCapture}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        seasons={seasons}
        activeSeason={activeSeason}
        onSeasonChange={switchSeason}
        onCreateSeason={async (name) => { await createSeason(name); }}
        onDeleteSeason={deleteSeason}
        isAdmin={isAdmin}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* Show Coach AI welcome for new users with no games */}
            {games.length === 0 ? (
              <div className="journal-page rounded-2xl overflow-hidden">
                <div className="px-6 md:px-10 py-8">
                  <JournalHeader playerName={profile.name} className="mb-6 animate-fade-in" />
                  
                  <EmptyDashboardWelcome
                    playerName={profile.name || 'Player'}
                    avatarUrl={profile.avatar}
                    hasSkippedAvatar={Boolean(profile.avatarSkippedAt)}
                    isFirstTimeAfterOnboarding={justCompletedOnboarding}
                    onLogFirstGame={() => {
                      // Trigger add game dialog - navigate to games tab
                      setActiveTab('games');
                    }}
                    onPregameTalk={() => {
                      setActiveTab('coach');
                    }}
                    onUploadPhoto={() => {
                      setActiveTab('settings');
                    }}
                    onSkipPhoto={() => {
                      updateProfile({ ...profile, avatarSkippedAt: new Date().toISOString() });
                      toast.info("No problem! You can add a photo anytime in Settings.");
                    }}
                    onAvatarGenerated={(newUrl) => {
                      updateProfile({ ...profile, avatar: newUrl });
                    }}
                    onAvatarUploaded={uploadAvatar}
                    onAvatarDeleted={async () => {
                      await updateProfile({ ...profile, avatar: undefined });
                    }}
                    onIntroPlayed={() => {
                      // Clear the flag after intro is played
                      setJustCompletedOnboarding(false);
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Full journal page wrapper - existing content */
              <div className="journal-page rounded-2xl overflow-hidden">
                <div className="px-6 md:px-10 py-8 space-y-8">
                  <JournalHeader playerName={profile.name} className="mb-2 animate-fade-in" />
                  
                  <div className="flex items-center justify-end flex-wrap gap-4">
                    
                    {/* Team Filter for Dashboard */}
                    {teams.length > 0 && (
                      <Select value={dashboardTeamFilter} onValueChange={setDashboardTeamFilter}>
                        <SelectTrigger className="w-[180px] bg-background/80">
                          <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="All Teams" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} {team.is_primary && '★'}
                            </SelectItem>
                          ))}
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Player Header - styled for journal */}
                  <div className="journal-section">
                    <PlayerHeader 
                      profile={profile} 
                      seasonStats={dashboardStats} 
                      games={dashboardFilteredGames} 
                      xpProgress={xpProgress}
                      tierAchievements={achievedTiers}
                    />
                  </div>

                  {/* Season Averages */}
                  <AnimatedSection className="journal-section" delay={0.1}>
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                      <h2 className="journal-heading mb-0">
                        {dashboardTeamFilter === 'all' ? 'Season Averages' : 'Team Averages'}
                      </h2>
                      {dashboardTeamFilter !== 'all' && (
                        <span className="text-sm text-muted-foreground">
                          {dashboardFilteredGames.length} game{dashboardFilteredGames.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <AnimatedContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <AnimatedItem>
                        <StatCard label="Points" value={dashboardStats.avgPoints} icon={Target} className="journal-card" />
                      </AnimatedItem>
                      <AnimatedItem>
                        <StatCard label="Rebounds" value={dashboardStats.avgRebounds} icon={Repeat} className="journal-card" />
                      </AnimatedItem>
                      <AnimatedItem>
                        <StatCard label="Assists" value={dashboardStats.avgAssists} icon={Zap} className="journal-card" />
                      </AnimatedItem>
                      <AnimatedItem>
                        <StatCard label="Steals" value={dashboardStats.avgSteals} icon={Shield} className="journal-card" />
                      </AnimatedItem>
                      <AnimatedItem>
                        <StatCard label="Blocks" value={dashboardStats.avgBlocks} icon={HandMetal} className="journal-card" />
                      </AnimatedItem>
                      <AnimatedItem>
                        <StatCard label="FG%" value={dashboardStats.fgPercentage} suffix="%" icon={Percent} className="journal-card" />
                      </AnimatedItem>
                    </AnimatedContainer>
                  </AnimatedSection>

                  {/* Performance Charts */}
                  <AnimatedSection className="journal-section" delay={0.3}>
                    <h2 className="journal-heading">Performance Trends</h2>
                    <AnimatedContainer className="grid md:grid-cols-3 gap-4">
                      <AnimatedItem className="journal-card p-4 rounded-xl">
                        <StatsChart games={dashboardFilteredGames} stat="points" />
                      </AnimatedItem>
                      <AnimatedItem className="journal-card p-4 rounded-xl">
                        <StatsChart games={dashboardFilteredGames} stat="rebounds" />
                      </AnimatedItem>
                      <AnimatedItem className="journal-card p-4 rounded-xl">
                        <StatsChart games={dashboardFilteredGames} stat="assists" />
                      </AnimatedItem>
                    </AnimatedContainer>
                  </AnimatedSection>

                  {/* XP Progress */}
                  {xpProgress && (
                    <AnimatedSection className="journal-section" delay={0.4}>
                      <h2 className="journal-heading">Season XP Progress</h2>
                      <div 
                        className="journal-card p-4 rounded-xl cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                        onClick={() => setActiveTab('milestones')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('milestones')}
                      >
                        <div className="flex items-center gap-4">
                          <DiamondLevelBadge 
                            level={xpProgress.current_level} 
                            progressPercent={getXpProgressInLevel(xpProgress.current_xp).percent}
                            size="md" 
                          />
                          <div className="flex-1">
                            <XpProgressBar 
                              currentXp={xpProgress.current_xp} 
                              level={xpProgress.current_level}
                              showLabel={true}
                              animate={true}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view rewards</p>
                      </div>
                    </AnimatedSection>
                  )}

                  {/* Ring of Honor Eligibility Banner */}
                  {!ringOfHonorEligibility.loading && (
                    <RingOfHonorEligibilityBanner
                      isEligible={ringOfHonorEligibility.isEligible}
                      isAlreadyMember={ringOfHonorEligibility.isAlreadyMember}
                      hasOptedIn={profile?.ringOfHonorOptIn ?? false}
                      onJoinClick={() => setShowRingOfHonorModal(true)}
                    />
                  )}

                  {/* Recent Games */}
                  <AnimatedSection className="journal-section" delay={0.5}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="journal-heading mb-0">Recent Games</h2>
                      <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
                    </div>
                    {dashboardFilteredGames.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No games found for this team.
                      </p>
                    ) : (
                      <AnimatedContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dashboardFilteredGames.slice(0, 6).map((game) => (
                          <AnimatedItem key={game.id}>
                            <GameCard 
                              game={game} 
                              profile={profile} 
                              onDelete={deleteGame}
                              teams={teams}
                              onTeamChange={updateGameTeam}
                            />
                          </AnimatedItem>
                        ))}
                      </AnimatedContainer>
                    )}
                  </AnimatedSection>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (() => {
          // Filter games for Games tab by team
          const gamesTabFilteredGames = gamesTabTeamFilter === 'all' 
            ? games 
            : games.filter(g => 
                gamesTabTeamFilter === 'unassigned' 
                  ? !g.teamId 
                  : g.teamId === gamesTabTeamFilter
              );

          return (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Game Log</h1>
                  <p className="text-muted-foreground">
                    {gamesTabFilteredGames.length} games recorded
                    {gamesTabTeamFilter !== 'all' && ` • ${teams.find(t => t.id === gamesTabTeamFilter)?.name || 'Unassigned'}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Team Filter */}
                  {teams.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Select value={gamesTabTeamFilter} onValueChange={setGamesTabTeamFilter}>
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
                      {gamesTabTeamFilter !== 'all' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setGamesTabTeamFilter('all')}
                          className="h-9 w-9"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleQuickLiveStatsClick}
                    variant="outline"
                    className="gap-2"
                  >
                    <Radio className="w-4 h-4" />
                    <span className="hidden sm:inline">Live Stats</span>
                  </Button>
                  <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
                </div>
              </div>

              {gamesTabFilteredGames.length === 0 ? (
                <div className="stat-card text-center py-12 space-y-6">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-lg">
                      {gamesTabTeamFilter !== 'all' 
                        ? `No games recorded for ${teams.find(t => t.id === gamesTabTeamFilter)?.name || 'Unassigned'}.`
                        : 'No games recorded yet.'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {gamesTabTeamFilter !== 'all'
                        ? 'Try selecting a different team or log a new game.'
                        : 'Start tracking your season by adding your first game!'
                      }
                    </p>
                  </div>
                  
                  {gamesTabTeamFilter === 'all' && (
                    <>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                          onClick={handleQuickLiveStatsClick}
                          className="gradient-primary gap-2 w-full sm:w-auto"
                          size="lg"
                        >
                          <Radio className="w-5 h-5" />
                          Start Live Stats
                        </Button>
                        <span className="text-muted-foreground text-sm">or</span>
                        <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
                      </div>
                      
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Use <strong>Live Stats</strong> to track your game in real-time, or <strong>Log Game</strong> to add stats after the game.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gamesTabFilteredGames.map((game) => (
                    <GameCard 
                      key={game.id} 
                      game={game} 
                      profile={profile} 
                      onDelete={deleteGame}
                      teams={teams}
                      onTeamChange={updateGameTeam}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <StatisticsPage 
            games={games} 
            seasonStats={seasonStats} 
            teams={teams}
          />
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Season Schedule</h1>
                <p className="text-muted-foreground">
                  {upcomingGames.length} upcoming games
                  {teamFilter !== 'all' && ` • ${teams.find(t => t.id === teamFilter)?.name || 'Unassigned'}`}
                  {tournamentFilter !== 'all' && ` • ${tournamentFilter}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Team Filter */}
                {teams.length > 1 && (
                  <div className="flex items-center gap-1">
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
                {/* Tag Filter */}
                {tournaments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Trophy className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="All Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {tournaments.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tournamentFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTournamentFilter('all')}
                        className="h-9 w-9"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  onClick={handleQuickLiveStatsClick}
                  className="gradient-primary"
                  size={isMobile ? "icon" : "default"}
                  title="Live Stats"
                >
                  <Radio className="w-4 h-4" />
                  {!isMobile && <span className="ml-2">Live Stats</span>}
                  {isMobile && <span className="sr-only">Live Stats</span>}
                </Button>
                <ImportScheduleDialog onImport={bulkImportScheduledGames} isMobile={isMobile} />
                <AddScheduleDialog onAddGame={addScheduledGame} onBulkAddGames={bulkImportScheduledGames} isMobile={isMobile} />
              </div>
            </div>


            {/* Calendar View */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Calendar View
              </h2>
              <ScheduleCalendar 
                games={filteredSchedule} 
                playedGames={games} 
                onAddGame={addScheduledGame}
                onUpdateGame={updateScheduledGame}
                onBulkAddGames={bulkImportScheduledGames}
              />
            </section>

            {/* Upcoming Games */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Upcoming Games
              </h2>
              {upcomingGames.length === 0 ? (
                <div className="stat-card text-center py-12">
                  <p className="text-muted-foreground">No upcoming games scheduled.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add games to your schedule!
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingGames.map((game) => (
                    <ScheduleCard
                      key={game.id}
                      game={game}
                      linkedGame={findLinkedGame(game)}
                      onDelete={deleteScheduledGame}
                      teams={teams}
                      onUpdateTeam={async (gameId, teamId) => {
                        await updateScheduledGame(gameId, { teamId: teamId || undefined });
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past Games */}
            {pastScheduledGames.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Past Scheduled Games
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastScheduledGames.map((game) => (
                    <ScheduleCard
                      key={game.id}
                      game={game}
                      linkedGame={findLinkedGame(game)}
                      onDelete={deleteScheduledGame}
                      teams={teams}
                      onUpdateTeam={async (gameId, teamId) => {
                        await updateScheduledGame(gameId, { teamId: teamId || undefined });
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Video Clips</h1>
                <p className="text-muted-foreground">
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
        )}

        {/* Milestones Tab - Real Game Achievements */}
        {activeTab === 'milestones' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Milestones</h1>
              <p className="text-muted-foreground">
                Achievements earned from your real basketball games
              </p>
            </div>
            <MilestoneCollection />
          </div>
        )}

        {/* Mini Games Tab */}
        {activeTab === 'minigames' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Mini-Games</h1>
              <p className="text-muted-foreground">
                Play mini-games, earn badges, and climb the leaderboard
              </p>
            </div>
            <GamesHub />
          </div>
        )}

        {/* Coach Tab */}
        {activeTab === 'coach' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Coach AI</h1>
              <p className="text-muted-foreground">
                Get personalized feedback, basketball knowledge, and player comparisons
              </p>
            </div>
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="chat">Coach Chat</TabsTrigger>
                <TabsTrigger value="knowledge">BB Knowledge</TabsTrigger>
                <TabsTrigger value="compare">Player Compare</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="mt-6">
                <div className="max-w-2xl">
                  <CoachChat games={games} seasonStats={seasonStats} profile={profile} />
                </div>
              </TabsContent>
              
              <TabsContent value="knowledge" className="mt-6">
                <div className="max-w-3xl">
                  <BasketballKnowledge />
                </div>
              </TabsContent>
              
              <TabsContent value="compare" className="mt-6">
                <div className="max-w-3xl">
                  <PlayerComparison seasonStats={seasonStats} profile={profile} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">
                  Manage your player profile
                </p>
              </div>
              <Button
                variant="outline"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
            <SettingsPanel 
              profile={profile} 
              onUpdateProfile={updateProfile} 
              onUploadAvatar={uploadAvatar}
              onStartOver={() => {
                // Clear the localStorage intro flag
                localStorage.removeItem('hoopjournal_intro_seen');
                // Force page reload to trigger fresh onboarding detection
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage users, review reports, and view metrics
              </p>
            </div>
            <AdminPanel />
          </div>
        )}
      </main>

      {/* Quick Live Stats Dialog - OUTSIDE tab switching */}
      <QuickLiveStatsDialog
        open={showQuickLiveStatsDialog}
        onOpenChange={setShowQuickLiveStatsDialog}
        todayGames={todayGames}
        teams={teams}
        onStartCapture={handleStartQuickCapture}
      />

      {/* Persistent music bar - OUTSIDE tab switching */}
      <PersistentMusicBar url={profile.themeMusicUrl} />
      
      {/* Milestone Reveal Modal */}
      <AnimatePresence>
        {showReveal && pendingMilestones.length > 0 && (
          <MilestoneReveal
            milestones={pendingMilestones}
            onComplete={closeReveal}
          />
        )}
      </AnimatePresence>

      {/* XP Reveal Modal */}
      <AnimatePresence>
        {showXpReveal && pendingXpResult && (
          <PostGameXpReveal
            performance={pendingXpResult.performance}
            xpResult={pendingXpResult.xpResult}
            onClose={closeXpReveal}
          />
        )}
      </AnimatePresence>

      {/* Tier Celebration - New tier unlocked for first time */}
      <AnimatePresence>
        {showTierCelebration && pendingTierCelebration && (
          <TierCelebration
            tier={pendingTierCelebration.tier}
            performanceScore={pendingTierCelebration.performanceScore}
            onComplete={closeTierCelebration}
          />
        )}
      </AnimatePresence>

      {/* Level Up Celebration */}
      <AnimatePresence>
        {showLevelUpCelebration && pendingXpResult && (
          <LevelUpCelebration
            previousLevel={pendingXpResult.xpResult.previousLevel}
            newLevel={pendingXpResult.xpResult.newLevel}
            newRewards={pendingXpResult.xpResult.newRewards}
            onComplete={closeLevelUpCelebration}
          />
        )}
      </AnimatePresence>

      {/* Ring of Honor Opt-In Modal */}
      <RingOfHonorOptInModal
        open={showRingOfHonorModal}
        onOpenChange={(open) => {
          setShowRingOfHonorModal(open);
          if (!open) {
            ringOfHonorEligibility.checkEligibility();
          }
        }}
        playerData={{
          displayName: profile.displayName || profile.name || 'Player',
          avatarUrl: profile.avatar,
        }}
      />
    </div>
  );
}
