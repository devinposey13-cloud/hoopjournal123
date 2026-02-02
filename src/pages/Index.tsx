import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence } from 'framer-motion';
import { Navigation, Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PlayerHeader } from '@/components/PlayerHeader';
import { GameCard } from '@/components/GameCard';
import { AddGameDialog } from '@/components/AddGameDialog';
import { AddScheduleDialog } from '@/components/AddScheduleDialog';
import { CoachHub } from '@/components/coach/CoachHub';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AuthForm } from '@/components/AuthForm';
import { JournalHeader } from '@/components/JournalHeader';
import { AdminPanel } from '@/components/AdminPanel';
import { GamesHub } from '@/components/games/GamesHub';
import { ProgressHub } from '@/components/ProgressHub';
import { LogSection } from '@/components/LogSection';
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
import { OnboardingFlow, OnboardingData, OnboardingCompletionAction } from '@/components/OnboardingFlow';
import { EmptyDashboardWelcome } from '@/components/EmptyDashboardWelcome';
import { TodayCard } from '@/components/dashboard/TodayCard';
import { DashboardQuickStats } from '@/components/dashboard/DashboardQuickStats';
import { DailyInsight } from '@/components/dashboard/DailyInsight';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PlayerCard } from '@/components/dashboard/PlayerCard';
import { useAuth } from '@/hooks/useAuth';
import { useGameWithMilestones } from '@/hooks/useGameWithMilestones';
import { useAdmin } from '@/hooks/useAdmin';
import { useApprovalStatus } from '@/hooks/useApprovalStatus';
import { useFirstLogin } from '@/hooks/useFirstLogin';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import { useRetroactiveXp } from '@/hooks/useRetroactiveXp';
import { isAfter, isBefore, isToday, startOfDay, isSameDay, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LogOut, Trophy, X, Radio, Users, TrendingUp, MessageSquare, Gamepad2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardSkeleton, GamesTabSkeleton, ScheduleTabSkeleton, GamesHubTabSkeleton, CoachTabSkeleton, StatsTabSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnimatedContainer, AnimatedItem, AnimatedSection } from '@/components/ui/animated-container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
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
  const [coachPrefillPrompt, setCoachPrefillPrompt] = useState<string | undefined>();
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
  const handleOnboardingComplete = async (data: OnboardingData, action?: OnboardingCompletionAction) => {
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
    
    // Handle completion action - route user appropriately
    if (action === 'start_game') {
      // Navigate to Log tab to add first game
      setActiveTab('log');
    } else if (action === 'pregame_talk') {
      // Navigate to Coach tab with pregame context
      setCoachPrefillPrompt("Hey Coach, I have a game coming up. Can you help me get mentally ready?");
      setActiveTab('coach');
    } else if (action === 'explore_dashboard') {
      // Stay on dashboard (default)
      setActiveTab('dashboard');
    }
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
      case 'minigames':
        return <GamesHubTabSkeleton />;
      case 'coach':
        return <CoachTabSkeleton />;
      default:
        return <DashboardSkeleton />;
    }
  };

  if (dataLoading) {
    return (
      <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
        {!isMobile && (
          <Navigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            seasons={seasons}
            activeSeason={activeSeason}
            onSeasonChange={switchSeason}
            onCreateSeason={async (name) => { await createSeason(name); }}
            onDeleteSeason={deleteSeason}
            isAdmin={isAdmin}
          />
        )}
        <main className="container mx-auto px-4 py-6">
          {renderLoadingSkeleton()}
        </main>
        {isMobile && (
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
        )}
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
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
      {/* Desktop: Top Navigation */}
      {!isMobile && (
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={switchSeason}
          onCreateSeason={async (name) => { await createSeason(name); }}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}

      {/* Mobile: Bottom Navigation */}
      {isMobile && (
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
      )}

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
              /* Full journal page wrapper - new command center layout */
              <div className="journal-page rounded-2xl overflow-hidden">
                <div className="px-6 md:px-10 py-6 space-y-6">
                  {/* Primary Header - Player Card */}
                  <AnimatedSection delay={0.02}>
                    <div className="relative">
                      <PlayerCard
                        profile={profile}
                        teamName={teams.find(t => t.is_primary)?.name}
                        tierAchievements={achievedTiers.map(t => ({ tier: t.tier }))}
                        seasonRecord={{ wins: dashboardStats.wins, losses: dashboardStats.losses }}
                        games={dashboardFilteredGames}
                        seasonStats={dashboardStats}
                        xpProgress={xpProgress}
                        className="shadow-md"
                      />
                      {/* Dear Basketball - Reflection Entry Point to Coach AI */}
                      <button
                        onClick={() => {
                          setCoachPrefillPrompt("Dear Basketball — today I want to reflect on how I played, what I felt during the game, and what I want to improve next time.");
                          setActiveTab('coach');
                        }}
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                        title="Reflect on your game with Coach AI"
                      >
                        <span>✏️</span>
                        <span className="hidden sm:inline font-medium" style={{ fontFamily: "'Dancing Script', cursive" }}>Dear Basketball</span>
                        <span className="sm:hidden font-medium">Journal</span>
                      </button>
                    </div>
                  </AnimatedSection>
                  {/* Team Filter */}
                  {teams.length > 0 && (
                    <div className="flex items-center justify-end">
                      <Select value={dashboardTeamFilter} onValueChange={setDashboardTeamFilter}>
                        <SelectTrigger className="w-[160px] bg-background/80">
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
                    </div>
                  )}

                  {/* TODAY CARD - Hero priority */}
                  <AnimatedSection delay={0.05}>
                    <TodayCard
                      schedule={schedule}
                      games={dashboardFilteredGames}
                      currentStreak={dashboardStats.wins}
                      xpLevel={xpProgress?.current_level}
                      onLogGame={() => setActiveTab('games')}
                      onOpenCoach={() => setActiveTab('coach')}
                      onStartLiveCapture={todayGames.length > 0 ? handleQuickLiveStatsClick : undefined}
                    />
                  </AnimatedSection>


                  {/* DAILY INSIGHT / AI SUMMARY */}
                  <AnimatedSection delay={0.15}>
                    <DailyInsight
                      games={dashboardFilteredGames}
                      seasonStats={dashboardStats}
                      playerName={profile.name || 'Player'}
                    />
                  </AnimatedSection>

                  {/* XP Progress - Compact */}
                  {xpProgress && (
                    <AnimatedSection delay={0.2}>
                      <div 
                        className="journal-card p-4 rounded-xl cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                        onClick={() => setActiveTab('stats')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('stats')}
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

                  {/* RECENT ACTIVITY */}
                  <AnimatedSection delay={0.25}>
                    <RecentActivity
                      games={dashboardFilteredGames}
                      clips={clips}
                      onViewGame={(gameId) => navigate(`/game/${gameId}`)}
                      onViewAllGames={() => setActiveTab('games')}
                    />
                  </AnimatedSection>

                  {/* QUICK LINKS */}
                  <AnimatedSection delay={0.3}>
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('stats')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Progress</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('coach')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Coach</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('minigames')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Gamepad2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Training</span>
                      </Button>
                    </div>
                  </AnimatedSection>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Games/Log Tab - Uses LogSection with sub-tabs */}
        {activeTab === 'games' && (
          <LogSection
            games={games}
            schedule={schedule}
            teams={teams}
            profile={profile}
            isMobile={isMobile}
            addGame={addGame}
            deleteGame={deleteGame}
            updateGameTeam={updateGameTeam}
            addScheduledGame={addScheduledGame}
            updateScheduledGame={updateScheduledGame}
            deleteScheduledGame={deleteScheduledGame}
            bulkImportScheduledGames={bulkImportScheduledGames}
          />
        )}

        {/* Stats/Progress Tab - Now uses ProgressHub */}
        {activeTab === 'stats' && (
          <ProgressHub
            games={games}
            clips={clips}
            seasonStats={seasonStats}
            teams={teams}
            isMobile={isMobile}
            addClip={addClip}
            deleteClip={deleteClip}
          />
        )}

        {/* Schedule Tab - Now handled by LogSection, redirect to games */}
        {activeTab === 'schedule' && (
          <LogSection
            games={games}
            schedule={schedule}
            teams={teams}
            profile={profile}
            isMobile={isMobile}
            addGame={addGame}
            deleteGame={deleteGame}
            updateGameTeam={updateGameTeam}
            addScheduledGame={addScheduledGame}
            updateScheduledGame={updateScheduledGame}
            deleteScheduledGame={deleteScheduledGame}
            bulkImportScheduledGames={bulkImportScheduledGames}
            initialSubTab="schedule"
          />
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
          <CoachHub 
            games={games} 
            seasonStats={seasonStats} 
            profile={profile} 
            prefillPrompt={coachPrefillPrompt}
            onPrefillConsumed={() => setCoachPrefillPrompt(undefined)}
          />
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
