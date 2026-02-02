import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ProgressHub, ProgressSubTab } from '@/components/ProgressHub';
import { useCloudData } from '@/hooks/useCloudData';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Navigation, Tab } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';

const validSubTabs: ProgressSubTab[] = ['overview', 'stats', 'trends', 'clips', 'achievements'];

export default function Progress() {
  const { subTab } = useParams<{ subTab?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const isMobile = useIsMobile();
  
  const {
    games,
    clips,
    seasonStats,
    seasons,
    activeSeason,
    switchSeason,
    createSeason,
    deleteSeason,
    addClip,
    deleteClip,
    loading,
  } = useCloudData();
  
  const { teams } = usePlayerTeams();

  // Handle tab change from navigation
  const handleTabChange = (tab: Tab) => {
    if (tab === 'stats') {
      navigate('/progress/overview');
    } else if (tab === 'games') {
      navigate('/log/history');
    } else if (tab === 'dashboard') {
      navigate('/');
    } else {
      navigate('/');
    }
  };

  // Handle season change
  const handleSeasonChange = (seasonId: string) => {
    switchSeason(seasonId);
  };

  // Handle create season
  const handleCreateSeason = async (name: string): Promise<void> => {
    await createSeason(name);
  };

  // Handle sub-tab change within Progress
  const handleSubTabChange = (newSubTab: ProgressSubTab) => {
    navigate(`/progress/${newSubTab}`);
  };

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/" replace />;
  }

  // Show loading state
  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  // Validate subTab and default to 'overview'
  const initialSubTab: ProgressSubTab = validSubTabs.includes(subTab as ProgressSubTab) 
    ? (subTab as ProgressSubTab) 
    : 'overview';

  // Redirect invalid sub-tabs to overview
  if (subTab && !validSubTabs.includes(subTab as ProgressSubTab)) {
    return <Navigate to="/progress/overview" replace />;
  }

  return (
    <div className={cn("min-h-screen bg-background", isMobile ? "pb-20" : "")}>
      {/* Desktop Navigation */}
      {!isMobile && (
        <Navigation
          activeTab="stats"
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
        <ProgressHub
          games={games}
          clips={clips}
          seasonStats={seasonStats}
          teams={teams}
          isMobile={isMobile}
          addClip={addClip}
          deleteClip={deleteClip}
          initialSubTab={initialSubTab}
          onSubTabChange={handleSubTabChange}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNavigation
          activeTab="stats"
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
