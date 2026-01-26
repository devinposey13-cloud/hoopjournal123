import { useState } from 'react';
import { Navigation, Tab } from '@/components/Navigation';
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
import { SettingsPanel } from '@/components/SettingsPanel';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { useCloudData } from '@/hooks/useCloudData';
import { isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import {
  Target,
  Repeat,
  Zap,
  Shield,
  HandMetal,
  Percent,
} from 'lucide-react';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { user, loading: authLoading, signOut } = useAuth();
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
    addClip,
    deleteClip,
    updateProfile,
    uploadAvatar,
    addScheduledGame,
    deleteScheduledGame,
    bulkImportScheduledGames,
    createSeason,
    switchSeason,
  } = useCloudData();

  // Show auth form if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const today = startOfDay(new Date());
  const upcomingGames = schedule.filter(
    (g) => isAfter(new Date(g.date), today) || isToday(new Date(g.date))
  );
  const pastScheduledGames = schedule.filter(
    (g) => isBefore(new Date(g.date), today) && !isToday(new Date(g.date))
  );

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        seasons={seasons}
        activeSeason={activeSeason}
        onSeasonChange={switchSeason}
        onCreateSeason={async (name) => { await createSeason(name); }}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <PlayerHeader profile={profile} seasonStats={seasonStats} games={games} />

            {/* Season Averages */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Season Averages
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  label="Points"
                  value={seasonStats.avgPoints}
                  icon={Target}
                />
                <StatCard
                  label="Rebounds"
                  value={seasonStats.avgRebounds}
                  icon={Repeat}
                />
                <StatCard
                  label="Assists"
                  value={seasonStats.avgAssists}
                  icon={Zap}
                />
                <StatCard
                  label="Steals"
                  value={seasonStats.avgSteals}
                  icon={Shield}
                />
                <StatCard
                  label="Blocks"
                  value={seasonStats.avgBlocks}
                  icon={HandMetal}
                />
                <StatCard
                  label="FG%"
                  value={seasonStats.fgPercentage}
                  suffix="%"
                  icon={Percent}
                />
              </div>
            </section>

            {/* Performance Charts */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Performance Trends
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <StatsChart games={games} stat="points" />
                <StatsChart games={games} stat="rebounds" />
                <StatsChart games={games} stat="assists" />
              </div>
            </section>

            {/* Recent Games */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Games
                </h2>
                <AddGameDialog onAddGame={addGame} />
              </div>
              {games.length === 0 ? (
                <div className="stat-card text-center py-12">
                  <p className="text-muted-foreground">No games recorded yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Add Game" to log your first game!
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.slice(0, 6).map((game) => (
                    <GameCard key={game.id} game={game} onDelete={deleteGame} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Game Log</h1>
                <p className="text-muted-foreground">
                  {games.length} games recorded
                </p>
              </div>
              <AddGameDialog onAddGame={addGame} />
            </div>

            {games.length === 0 ? (
              <div className="stat-card text-center py-16">
                <p className="text-muted-foreground text-lg">No games recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking your season by adding your first game!
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} onDelete={deleteGame} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Season Schedule</h1>
                <p className="text-muted-foreground">
                  {upcomingGames.length} upcoming games
                </p>
              </div>
              <div className="flex gap-2">
                <ImportScheduleDialog onImport={bulkImportScheduledGames} />
                <AddScheduleDialog onAddGame={addScheduledGame} />
              </div>
            </div>

            {/* Calendar View */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Calendar View
              </h2>
              <ScheduleCalendar games={schedule} />
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
                      onDelete={deleteScheduledGame}
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
                      onDelete={deleteScheduledGame}
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
              <AddClipDialog onAddClip={addClip} />
            </div>

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
          </div>
        )}

        {/* Coach Tab */}
        {activeTab === 'coach' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">Coach AI</h1>
              <p className="text-muted-foreground">
                Get personalized feedback on your performance
              </p>
            </div>
            <div className="max-w-2xl">
              <CoachChat games={games} seasonStats={seasonStats} />
            </div>
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
            <SettingsPanel profile={profile} onUpdateProfile={updateProfile} onUploadAvatar={uploadAvatar} />
          </div>
        )}
      </main>
    </div>
  );
}
