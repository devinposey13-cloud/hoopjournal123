import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
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
import { BasketballKnowledge } from '@/components/BasketballKnowledge';
import { PlayerComparison } from '@/components/PlayerComparison';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AuthForm } from '@/components/AuthForm';
import { ExploreClips } from '@/components/ExploreClips';
import { JournalHeader } from '@/components/JournalHeader';
import { AdminPanel } from '@/components/AdminPanel';
import { GamesHub } from '@/components/games/GamesHub';
import { MilestoneCollection } from '@/components/milestones/MilestoneCollection';
import { PersistentMusicBar } from '@/components/PersistentMusicBar';
import { MilestoneReveal } from '@/components/milestones/MilestoneReveal';
import { useAuth } from '@/hooks/useAuth';
import { useGameWithMilestones } from '@/hooks/useGameWithMilestones';
import { useAdmin } from '@/hooks/useAdmin';
import { isAfter, isBefore, isToday, startOfDay, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const { isAdmin } = useAdmin();
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
  } = useGameWithMilestones();

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
    <div className="min-h-screen bg-background pb-14">
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

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            {/* Full journal page wrapper */}
            <div className="journal-page rounded-2xl overflow-hidden">
              <div className="px-6 md:px-10 py-8 space-y-8">
                {/* Journal-style header */}
                <div className="text-center pb-6 border-b border-amber-800/20">
                  <h1 
                    className="text-4xl md:text-5xl lg:text-6xl mb-2"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    Dear Basketball,
                  </h1>
                  <div className="w-32 h-0.5 bg-amber-800/30 mx-auto my-4" />
                  <p 
                    className="text-lg md:text-xl opacity-80"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    {profile.name ? `${profile.name}'s Journey` : 'My Basketball Journey'}
                  </p>
                </div>

                {/* Player Header - styled for journal */}
                <div className="journal-section">
                  <PlayerHeader profile={profile} seasonStats={seasonStats} games={games} />
                </div>

                {/* Season Averages */}
                <section className="journal-section">
                  <h2 className="journal-heading">Season Averages</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Points" value={seasonStats.avgPoints} icon={Target} className="journal-card" />
                    <StatCard label="Rebounds" value={seasonStats.avgRebounds} icon={Repeat} className="journal-card" />
                    <StatCard label="Assists" value={seasonStats.avgAssists} icon={Zap} className="journal-card" />
                    <StatCard label="Steals" value={seasonStats.avgSteals} icon={Shield} className="journal-card" />
                    <StatCard label="Blocks" value={seasonStats.avgBlocks} icon={HandMetal} className="journal-card" />
                    <StatCard label="FG%" value={seasonStats.fgPercentage} suffix="%" icon={Percent} className="journal-card" />
                  </div>
                </section>

                {/* Performance Charts */}
                <section className="journal-section">
                  <h2 className="journal-heading">Performance Trends</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="journal-card p-4 rounded-xl">
                      <StatsChart games={games} stat="points" />
                    </div>
                    <div className="journal-card p-4 rounded-xl">
                      <StatsChart games={games} stat="rebounds" />
                    </div>
                    <div className="journal-card p-4 rounded-xl">
                      <StatsChart games={games} stat="assists" />
                    </div>
                  </div>
                </section>

                {/* Recent Games */}
                <section className="journal-section">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="journal-heading mb-0">Recent Games</h2>
                    <AddGameDialog onAddGame={addGame} />
                  </div>
                  {games.length === 0 ? (
                    <div className="journal-card text-center py-12 rounded-xl">
                      <p className="text-amber-900/70">No games recorded yet.</p>
                      <p className="text-sm text-amber-800/50 mt-1">
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
            </div>
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
                <AddScheduleDialog onAddGame={addScheduledGame} onBulkAddGames={bulkImportScheduledGames} />
              </div>
            </div>

            {/* Calendar View */}
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Calendar View
              </h2>
              <ScheduleCalendar 
                games={schedule} 
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
            <SettingsPanel profile={profile} onUpdateProfile={updateProfile} onUploadAvatar={uploadAvatar} />
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
    </div>
  );
}
