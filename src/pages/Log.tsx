import { useParams, Navigate } from 'react-router-dom';
import { LogSection, LogSubTab } from '@/components/LogSection';
import { useCloudData } from '@/hooks/useCloudData';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import { useAuth } from '@/hooks/useAuth';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const validSubTabs: LogSubTab[] = ['history', 'schedule', 'add'];

export default function Log() {
  const { subTab } = useParams<{ subTab?: string }>();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  const {
    games,
    schedule,
    profile,
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
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
    </div>
  );
}
