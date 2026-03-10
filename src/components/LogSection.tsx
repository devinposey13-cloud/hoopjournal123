import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameCard } from '@/components/GameCard';
import { AddGameDialog } from '@/components/AddGameDialog';
import { AddScheduleDialog } from '@/components/AddScheduleDialog';
import { ImportScheduleDialog } from '@/components/ImportScheduleDialog';
import { LiveStatCapture, LiveStatsSaveData } from '@/components/LiveStatCapture';
import { QuickLiveStatsDialog } from '@/components/QuickLiveStatsDialog';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { ScheduleCard } from '@/components/ScheduleCard';
import { GameStats, ScheduledGame, PlayerTeam } from '@/types/basketball';
import { getLetterGradeFromScore, calculateGameScore, getGradeColor } from '@/utils/gameGrading';
import { isAfter, isBefore, isToday, startOfDay, isSameDay, format, getHours } from 'date-fns';
import { Radio, Plus, Calendar, MapPin, Clock, ChevronRight, Trophy, Users, X, Zap, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export type LogSubTab = 'history' | 'schedule' | 'add';

interface LogSectionProps {
  games: GameStats[];
  schedule: ScheduledGame[];
  teams: PlayerTeam[];
  profile: any;
  isMobile: boolean;
  // Game actions
  addGame: (game: any) => Promise<any>;
  deleteGame: (id: string) => Promise<any>;
  updateGameTeam: (gameId: string, teamId: string | null) => Promise<any>;
  // Schedule actions
  addScheduledGame: (game: any) => Promise<any>;
  updateScheduledGame: (id: string, updates: any) => Promise<any>;
  deleteScheduledGame: (id: string) => Promise<any>;
  bulkImportScheduledGames: (games: any[]) => Promise<any>;
  // Initial sub-tab (optional)
  initialSubTab?: LogSubTab;
  // Auto-open Add Game dialog (for onboarding)
  autoOpenAddGame?: boolean;
  onAutoOpenAddGameConsumed?: () => void;
}

export function LogSection({
  games,
  schedule,
  teams,
  profile,
  isMobile,
  addGame,
  deleteGame,
  updateGameTeam,
  addScheduledGame,
  updateScheduledGame,
  deleteScheduledGame,
  bulkImportScheduledGames,
  initialSubTab = 'history',
  autoOpenAddGame,
  onAutoOpenAddGameConsumed,
}: LogSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSubTab, setActiveSubTab] = useState<LogSubTab>(initialSubTab);
  
  // Sync URL with tab changes when on /log routes
  const handleTabChange = (value: string) => {
    const newTab = value as LogSubTab;
    setActiveSubTab(newTab);
    
    // Only update URL if we're on a /log route
    if (location.pathname.startsWith('/log')) {
      navigate(`/log/${newTab}`, { replace: true });
    }
  };
  
  // Sync tab state when URL changes
  useEffect(() => {
    if (location.pathname.startsWith('/log')) {
      const pathTab = location.pathname.split('/')[2] as LogSubTab;
      if (pathTab && ['history', 'schedule', 'add'].includes(pathTab)) {
        setActiveSubTab(pathTab);
      }
    }
  }, [location.pathname]);

  const [gamesTabTeamFilter, setGamesTabTeamFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  
  // Quick Live Stats state
  const [showQuickLiveStatsDialog, setShowQuickLiveStatsDialog] = useState(false);
  const [showQuickLiveCapture, setShowQuickLiveCapture] = useState(false);
  const [quickCaptureOpponent, setQuickCaptureOpponent] = useState('');
  const [quickCaptureScheduledGameId, setQuickCaptureScheduledGameId] = useState<string | undefined>();
  const [quickCaptureTeamId, setQuickCaptureTeamId] = useState<string | undefined>();
  const [isSavingQuickCapture, setIsSavingQuickCapture] = useState(false);

  const today = startOfDay(new Date());
  
  // Get unique tags for filter dropdown
  const tournaments = [...new Set(schedule.filter(g => g.tournament).map(g => g.tournament!))].sort();
  
  // Apply filters for schedule
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

  // Get today's games for Quick Live Stats
  const todayGames = schedule.filter((g) => isToday(new Date(g.date)));

  // Filter games for history tab
  const gamesTabFilteredGames = gamesTabTeamFilter === 'all' 
    ? games 
    : games.filter(g => 
        gamesTabTeamFilter === 'unassigned' 
          ? !g.teamId 
          : g.teamId === gamesTabTeamFilter
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

  // Get next upcoming game (sorted by date)
  const nextGame = upcomingGames.length > 0 
    ? [...upcomingGames].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;

  // Get recent games (last 5)
  const recentGames = [...games]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Quick Live Stats handlers
  const handleQuickLiveStatsClick = () => {
    if (todayGames.length === 1) {
      setQuickCaptureOpponent(todayGames[0].opponent);
      setQuickCaptureScheduledGameId(todayGames[0].id);
      setQuickCaptureTeamId(todayGames[0].teamId);
      setShowQuickLiveCapture(true);
    } else {
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

  // Smart prompt: show "Did you just play?" banner in evening hours (5pm-11pm)
  const showSmartPrompt = useMemo(() => {
    const hour = getHours(new Date());
    return hour >= 17 && hour <= 23 && games.length > 0;
  }, [games.length]);

  const [dismissedSmartPrompt, setDismissedSmartPrompt] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Live Stats Dialog */}
      <QuickLiveStatsDialog
        open={showQuickLiveStatsDialog}
        onOpenChange={setShowQuickLiveStatsDialog}
        todayGames={todayGames}
        teams={teams}
        onStartCapture={handleStartQuickCapture}
      />

      {/* ===================== SMART PROMPT ===================== */}
      {showSmartPrompt && !dismissedSmartPrompt && (
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => setDismissedSmartPrompt(true)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Did you just play a game?</p>
              <p className="text-xs text-muted-foreground">Log it now while it's fresh</p>
            </div>
            <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
          </CardContent>
        </Card>
      )}

      {/* ===================== PRIMARY CTA - START LIVE GAME ===================== */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card hover:border-primary/30 transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/15 shrink-0">
              <Radio className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1">Start Live Game</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Track stats in real-time during your game
              </p>
              <Button
                onClick={handleQuickLiveStatsClick}
                size="lg"
                className="w-full sm:w-auto gradient-primary gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                <Radio className="w-4 h-4" />
                Start Live Game
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== SECONDARY CTA - QUICK LOG ===================== */}
      <Card className="overflow-hidden border-border/60 hover:border-border transition-all">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-muted shrink-0">
              <ClipboardList className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold mb-0.5">Log Your Last Game</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Enter stats from a completed game
              </p>
              <AddGameDialog 
                onAddGame={addGame} 
                isMobile={isMobile}
                autoOpen={autoOpenAddGame}
                onAutoOpenConsumed={onAutoOpenAddGameConsumed}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== UPCOMING GAME ===================== */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Upcoming Game
        </h2>
        {nextGame ? (
          <Card 
            className="overflow-hidden border-border/60 hover:border-primary/20 transition-all cursor-pointer"
            onClick={() => navigate(`/game/scheduled/${nextGame.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isToday(new Date(nextGame.date)) && (
                      <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 text-[10px] font-semibold uppercase">
                        Today
                      </Badge>
                    )}
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      nextGame.isHome 
                        ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                        : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    )}>
                      {nextGame.isHome ? 'Home' : 'Away'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold truncate">vs {nextGame.opponent}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(nextGame.date), 'EEE, MMM d')}
                    </span>
                    {nextGame.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {nextGame.time}
                      </span>
                    )}
                    {nextGame.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{nextGame.location}</span>
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/40">
            <CardContent className="p-5 text-center">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No upcoming games scheduled</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add your schedule so Hoop Journal can remind you before tip-off.
              </p>
              <AddScheduleDialog 
                onAddGame={addScheduledGame} 
                onBulkAddGames={bulkImportScheduledGames} 
                isMobile={isMobile} 
              />
            </CardContent>
          </Card>
        )}
      </section>

      {/* ===================== RECENT GAMES ===================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Games
          </h2>
          {games.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleTabChange('history')}
              className="text-muted-foreground hover:text-foreground gap-1 text-xs"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {recentGames.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-6 text-center space-y-3">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No games recorded yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start tracking your season by logging your first game.
                </p>
              </div>
              <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentGames.map((game) => {
              const gs = calculateGameScore(game);
              const grade = getLetterGradeFromScore(gs);
              const gradeColor = getGradeColor(grade);
              
              return (
                <Card 
                  key={game.id} 
                  className="overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer border-border/50"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      {/* Grade Badge */}
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                        style={{ 
                          backgroundColor: `${gradeColor}15`,
                          color: gradeColor,
                          border: `1px solid ${gradeColor}30`,
                        }}
                      >
                        {grade}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            game.isWin ? "bg-green-500" : "bg-red-500"
                          )} />
                          <span className="font-semibold text-sm truncate">vs {game.opponent}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            game.isWin 
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          )}>
                            {game.isWin ? 'W' : 'L'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {game.points} PTS • {game.assists} AST • {game.rebounds} REB
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(game.date), 'MMM d')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================== DETAILED TABS (COLLAPSED BY DEFAULT) ===================== */}
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full pt-4 border-t border-border">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="history">All Games</TabsTrigger>
          <TabsTrigger value="schedule">Full Schedule</TabsTrigger>
          <TabsTrigger value="add">Add Game</TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6 space-y-4">
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
            <p className="text-sm text-muted-foreground ml-auto">
              {gamesTabFilteredGames.length} games recorded
            </p>
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
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex gap-2 ml-auto">
              <ImportScheduleDialog onImport={bulkImportScheduledGames} isMobile={isMobile} />
              <AddScheduleDialog onAddGame={addScheduledGame} onBulkAddGames={bulkImportScheduledGames} isMobile={isMobile} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {upcomingGames.length} upcoming games
            {teamFilter !== 'all' && ` • ${teams.find(t => t.id === teamFilter)?.name || 'Unassigned'}`}
            {tournamentFilter !== 'all' && ` • ${tournamentFilter}`}
          </p>

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
        </TabsContent>

        {/* Add Game Tab */}
        <TabsContent value="add" className="mt-6">
          <div className="stat-card p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Add a New Game</h2>
              <p className="text-muted-foreground">
                Choose how you want to log your game
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Live Stats Option */}
              <div className="stat-card p-6 space-y-4 text-center border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Radio className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Live Stats</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your stats in real-time during the game
                  </p>
                </div>
                <Button
                  onClick={handleQuickLiveStatsClick}
                  className="gradient-primary w-full"
                >
                  Start Live Tracking
                </Button>
              </div>

              {/* Manual Entry Option */}
              <div className="stat-card p-6 space-y-4 text-center border-2 border-secondary hover:border-secondary/80 transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
                  <Trophy className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Log Game</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your stats after the game is over
                  </p>
                </div>
                <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
              </div>
            </div>

            {/* Schedule a Future Game */}
            <div className="pt-6 border-t border-border">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Want to add a game to your schedule instead?
                </p>
                <AddScheduleDialog 
                  onAddGame={addScheduledGame} 
                  onBulkAddGames={bulkImportScheduledGames} 
                  isMobile={isMobile} 
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
