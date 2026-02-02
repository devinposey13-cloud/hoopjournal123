import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { LogSection, LogSubTab } from '@/components/LogSection';
import { useCloudData } from '@/hooks/useCloudData';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Navigation, Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';

const validSubTabs: LogSubTab[] = ['history', 'schedule', 'add'];

export default function Log() {
  const { subTab } = useParams<{ subTab?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  
  const {
    games,
    schedule,
    profile,
    seasons,
    activeSeason,
    switchSeason,
    createSeason,
    deleteSeason,
    addGame,
    deleteGame,
    updateGameTeam,
    addScheduledGame,
    updateScheduledGame,
    deleteScheduledGame,
    bulkImportScheduledGames,
    loading,
  } = useCloudData();
  
  const { teams } = usePlayerTeams();

  // Handle tab change from navigation
  const handleTabChange = (tab: Tab) => {
    if (tab === 'games') {
      navigate('/log/history');
    } else if (tab === 'stats') {
      navigate('/');
    } else if (tab === 'dashboard') {
      navigate('/');
    } else {
      // For other tabs, navigate to dashboard and let it handle the tab
      navigate('/');
    }
  };

  // Handle season change - wrap switchSeason
  const handleSeasonChange = (seasonId: string) => {
    switchSeason(seasonId);
  };

  // Handle create season - wrap to match expected signature (Promise<void>)
  const handleCreateSeason = async (name: string): Promise<void> => {
    await createSeason(name);
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  // Show loading state
  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  // Validate subTab and default to 'history'
  const initialSubTab: LogSubTab = validSubTabs.includes(subTab as LogSubTab) 
    ? (subTab as LogSubTab) 
    : 'history';

  // Redirect invalid sub-tabs to history
  if (subTab && !validSubTabs.includes(subTab as LogSubTab)) {
    return <Navigate to="/log/history" replace />;
  }

  return (
    <div className={cn("min-h-screen bg-background", isMobile ? "pb-20" : "")}>
      {/* Desktop Navigation */}
      {!isMobile && (
        <Navigation
          activeTab="games"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={handleSeasonChange}
          onCreateSeason={handleCreateSeason}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
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
          initialSubTab={initialSubTab}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          activeTab="games"
          onTabChange={handleTabChange}
          seasons={seasons}
          activeSeason={activeSeason}
          onSeasonChange={handleSeasonChange}
          onCreateSeason={handleCreateSeason}
          onDeleteSeason={deleteSeason}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
