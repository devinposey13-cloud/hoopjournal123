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
import { GameStats, ScheduledGame, PlayerTeam } from '@/types/basketball';
import { getLetterGradeFromScore, calculateGameScore, getGradeColor } from '@/utils/gameGrading';
import { getGameStatus, getSmartPrompt, getNextRelevantGame, findLinkedLoggedGame, getMissingGames, getSeasonTrackingSummary, type GameStatus, type GameStatusResult } from '@/utils/gameStatus';
import { calculateConsistencyStreak } from '@/utils/xpCalculations';
import { isAfter, isBefore, isToday, startOfDay, isSameDay, format } from 'date-fns';
import { Radio, Calendar, MapPin, Clock, ChevronRight, ChevronLeft, Trophy, Users, X, Zap, ClipboardList, AlertCircle, Check, Flame } from 'lucide-react';
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
  addGame: (game: any) => Promise<any>;
  deleteGame: (id: string) => Promise<any>;
  updateGameTeam: (gameId: string, teamId: string | null) => Promise<any>;
  addScheduledGame: (game: any) => Promise<any>;
  updateScheduledGame: (id: string, updates: any) => Promise<any>;
  deleteScheduledGame: (id: string) => Promise<any>;
  bulkImportScheduledGames: (games: any[]) => Promise<any>;
  initialSubTab?: LogSubTab;
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
  
  const handleTabChange = (value: string) => {
    const newTab = value as LogSubTab;
    setActiveSubTab(newTab);
    if (location.pathname.startsWith('/log')) {
      navigate(`/log/${newTab}`, { replace: true });
    }
  };
  
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
  const [showQuickLiveStatsDialog, setShowQuickLiveStatsDialog] = useState(false);
  const [showQuickLiveCapture, setShowQuickLiveCapture] = useState(false);
  const [quickCaptureOpponent, setQuickCaptureOpponent] = useState('');
  const [quickCaptureScheduledGameId, setQuickCaptureScheduledGameId] = useState<string | undefined>();
  const [quickCaptureTeamId, setQuickCaptureTeamId] = useState<string | undefined>();
  const [isSavingQuickCapture, setIsSavingQuickCapture] = useState(false);

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Smart prompt - only used for game day context in unified card
  const smartPrompt = useMemo(() => {
    return getSmartPrompt(schedule, games);
  }, [games, schedule]);

  // Next relevant game for the upcoming game card (uses status engine)
  const nextRelevantGame = useMemo(() => {
    return getNextRelevantGame(schedule, games);
  }, [schedule, games]);

  const today = startOfDay(new Date());
  const tournaments = [...new Set(schedule.filter(g => g.tournament).map(g => g.tournament!))].sort();
  
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
  const todayGames = schedule.filter((g) => isToday(new Date(g.date)));

  const gamesTabFilteredGames = gamesTabTeamFilter === 'all' 
    ? games 
    : games.filter(g => 
        gamesTabTeamFilter === 'unassigned' 
          ? !g.teamId 
          : g.teamId === gamesTabTeamFilter
      );

  const findLinkedGame = (scheduledGame: ScheduledGame) => {
    return findLinkedLoggedGame(scheduledGame, games);
  };

  const nextGame = nextRelevantGame?.game ?? (
    upcomingGames.length > 0 
      ? [...upcomingGames].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
      : null
  );
  const nextGameStatus = nextGame ? getGameStatus(nextGame, games) : null;

  const recentGames = [...games]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Missing games for recovery prompts
  const missingGames = useMemo(() => getMissingGames(schedule, games), [schedule, games]);

  // Season tracking summary
  const seasonSummary = useMemo(() => getSeasonTrackingSummary(schedule, games), [schedule, games]);

  // Consistency streak
  const streak = useMemo(() => calculateConsistencyStreak(games, schedule), [games, schedule]);

  // Season averages
  const seasonAvgs = useMemo(() => {
    if (games.length === 0) return null;
    const total = games.reduce((acc, g) => ({
      pts: acc.pts + g.points,
      reb: acc.reb + g.rebounds,
      ast: acc.ast + g.assists,
    }), { pts: 0, reb: 0, ast: 0 });
    const n = games.length;
    return {
      ppg: (total.pts / n).toFixed(1),
      rpg: (total.reb / n).toFixed(1),
      apg: (total.ast / n).toFixed(1),
    };
  }, [games]);

  // Calendar: get games for the selected month grouped by date
  const calendarGames = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59);
    
    const monthScheduled = filteredSchedule.filter(g => {
      const d = new Date(g.date);
      return d >= monthStart && d <= monthEnd;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date string
    const grouped: { date: string; tournament?: string; games: (ScheduledGame & { status: GameStatus; statusResult: GameStatusResult; linkedGame?: GameStats })[] }[] = [];
    
    monthScheduled.forEach(sg => {
      const dateKey = format(new Date(sg.date), 'yyyy-MM-dd');
      const statusResult = getGameStatus(sg, games);
      const linked = findLinkedLoggedGame(sg, games);

      let group = grouped.find(g => g.date === dateKey);
      if (!group) {
        group = { date: dateKey, games: [] };
        grouped.push(group);
      }
      group.games.push({ ...sg, status: statusResult.status, statusResult, linkedGame: linked });
    });

    // Set tournament label if all games in a group share it
    grouped.forEach(g => {
      const tourns = g.games.map(gm => gm.tournament).filter(Boolean);
      if (tourns.length > 0 && tourns.every(t => t === tourns[0])) {
        g.tournament = tourns[0];
      }
    });

    return grouped;
  }, [filteredSchedule, games, calendarMonth, today]);

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
        scheduledGameId: quickCaptureScheduledGameId,
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

  const getStatusBadge = (status: GameStatus) => {
    switch (status) {
      case 'game_day':
        return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase gap-1"><Zap className="w-3 h-3" />Game Day</Badge>;
      case 'live':
        return <Badge className="bg-primary/20 text-primary border-primary/40 text-[10px] font-bold uppercase animate-pulse gap-1"><Radio className="w-3 h-3" />Live</Badge>;
      case 'logged':
        return <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[10px] font-bold uppercase gap-1"><Check className="w-3 h-3" />Logged</Badge>;
      case 'stats_missing':
        return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-bold uppercase gap-1"><Clock className="w-3 h-3" />Stats Missing</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold uppercase text-muted-foreground gap-1"><Calendar className="w-3 h-3" />Scheduled</Badge>;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <QuickLiveStatsDialog
        open={showQuickLiveStatsDialog}
        onOpenChange={setShowQuickLiveStatsDialog}
        todayGames={todayGames}
        teams={teams}
        onStartCapture={handleStartQuickCapture}
      />

      {/* ===================== TABS ===================== */}
      <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
          <TabsTrigger value="history">All Games</TabsTrigger>
          <TabsTrigger value="schedule">Calendar</TabsTrigger>
          <TabsTrigger value="add">Add Game</TabsTrigger>
        </TabsList>

        {/* ===================== LOG HOME (ALL GAMES) ===================== */}
        <TabsContent value="history" className="mt-5 space-y-5">

          {/* Unified Game Actions Card */}
          <Card className={cn(
            "overflow-hidden transition-all",
            (smartPrompt?.type === 'game_day' || smartPrompt?.type === 'live')
              ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_0_24px_hsl(var(--primary)/0.08)]"
              : "border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card"
          )}>
            <CardContent className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Game Actions</h2>
                {(smartPrompt?.type === 'game_day' || smartPrompt?.type === 'live') && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase gap-1">
                    <Zap className="w-3 h-3" />
                    Game Day
                  </Badge>
                )}
              </div>

              {/* Game Day context */}
              {(smartPrompt?.type === 'game_day' || smartPrompt?.type === 'live') && smartPrompt?.game && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
                  <Radio className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">vs {smartPrompt.game.opponent}</p>
                    <p className="text-xs text-muted-foreground">
                      {isToday(new Date(smartPrompt.game.date)) ? 'Today' : format(new Date(smartPrompt.game.date), 'EEE, MMM d')}
                      {smartPrompt.game.time ? ` • ${smartPrompt.game.time}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Primary: Start Live Game */}
              <div>
                <p className="text-sm text-muted-foreground mb-2.5">
                  Track stats in real time during your game.
                </p>
                <Button
                  onClick={() => {
                    if (smartPrompt?.type === 'game_day' || smartPrompt?.type === 'live') {
                      handleStartQuickCapture(smartPrompt.game.opponent, smartPrompt.game.id, smartPrompt.game.teamId);
                    } else {
                      handleQuickLiveStatsClick();
                    }
                  }}
                  size="lg"
                  className="w-full gradient-primary gap-2 font-semibold shadow-lg hover:shadow-xl transition-shadow text-base"
                >
                  <Radio className="w-5 h-5" />
                  {smartPrompt?.type === 'live' ? 'Resume Live Game' : 'Start Live Game'}
                </Button>
              </div>

              {/* Secondary: Log Game */}
              <div className="h-px bg-border/40" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Just finished a game?</p>
                <AddGameDialog 
                  onAddGame={addGame} 
                  isMobile={isMobile}
                  autoOpen={autoOpenAddGame}
                  onAutoOpenConsumed={onAutoOpenAddGameConsumed}
                  customTrigger={
                    <Button variant="ghost" size="sm" className="text-foreground gap-1.5 font-semibold text-sm h-9 px-4 border border-border/60 hover:border-border">
                      <ClipboardList className="w-4 h-4" />
                      Log Game
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Game */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Upcoming Game
            </h2>
            {nextGame ? (() => {
              const status = nextGameStatus!;
              const isActionable = status.status === 'game_day' || status.status === 'live' || status.status === 'stats_missing';
              const linkedLog = findLinkedLoggedGame(nextGame, games);
              return (
              <Card 
                className={cn(
                  "overflow-hidden hover:border-primary/20 transition-all cursor-pointer",
                  (status.status === 'game_day' || status.status === 'live')
                    ? "border-primary/40 bg-gradient-to-r from-primary/5 via-card to-card" 
                    : status.status === 'stats_missing'
                    ? "border-amber-500/20"
                    : "border-border/60"
                )}
                onClick={() => {
                  if (linkedLog) navigate(`/game/${linkedLog.id}`);
                  else navigate(`/game/scheduled/${nextGame.id}`);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {getStatusBadge(status.status)}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          nextGame.isHome 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-blue-500/10 text-blue-500"
                        )}>
                          {nextGame.isHome ? 'Home' : 'Away'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold truncate">vs {nextGame.opponent}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isToday(new Date(nextGame.date)) ? 'Today' : format(new Date(nextGame.date), 'EEE, MMM d')}
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
                    {(status.status === 'game_day' || status.status === 'live') ? (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleStartQuickCapture(nextGame.opponent, nextGame.id, nextGame.teamId); }}
                        size="sm"
                        className="gradient-primary shrink-0 gap-1 text-xs font-semibold"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        {status.status === 'live' ? 'Resume Live Game' : 'Start Live Game'}
                      </Button>
                    ) : status.status === 'stats_missing' ? (
                      <Button
                        onClick={(e) => { e.stopPropagation(); }}
                        variant="outline"
                        size="sm"
                        className="text-amber-500 border-amber-500/30 shrink-0 text-xs font-semibold"
                      >
                        Log Game
                      </Button>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })() : (
              <Card className="border-border/40">
                <CardContent className="p-5 text-center">
                  <Calendar className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
                   <p className="text-sm font-medium mb-1">No upcoming games scheduled</p>
                   <p className="text-xs text-muted-foreground mb-3">
                     Add your schedule so Hoop Journal can help you track your games.
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

          {/* Season Tracking Summary */}
          {(seasonAvgs || seasonSummary.totalScheduled > 0) && (
            <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
              {/* Stats row */}
              {seasonAvgs && (
                <div className="flex items-center justify-center gap-6 py-3 px-4">
                  <div className="text-center">
                    <p className="text-lg font-bold">{seasonAvgs.ppg}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">PPG</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold">{seasonAvgs.rpg}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">RPG</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold">{seasonAvgs.apg}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">APG</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold">{games.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">GP</p>
                  </div>
                </div>
              )}
              {/* Season tracking strip */}
              {seasonSummary.totalScheduled > 0 && (
                <div className={cn(
                  "flex items-center justify-between px-4 py-2.5 text-xs",
                  seasonAvgs ? "border-t border-border/50" : ""
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Season Tracking</span>
                    <span className="font-bold text-foreground">
                      {seasonSummary.logged} / {seasonSummary.totalScheduled} games logged
                    </span>
                  </div>
                  {seasonSummary.missing > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-500 hover:text-amber-400 gap-1 h-7 text-xs px-2"
                      onClick={() => handleTabChange('schedule')}
                    >
                      <AlertCircle className="w-3 h-3" />
                      {seasonSummary.missing} missing
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Consistency Streak */}
          {streak.current > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
              <Flame className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {streak.current} Game Streak
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Keep logging your games to extend your streak.
                </p>
              </div>
              {streak.best > streak.current && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best</p>
                  <p className="text-sm font-bold text-orange-500">{streak.best}</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Games */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Games
              </h2>
              {games.length > 5 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/log/history')}
                  className="text-muted-foreground hover:text-foreground gap-1 text-xs h-7 px-2"
                >
                  View All
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {recentGames.length === 0 && missingGames.length === 0 ? (
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
              <div className="space-y-1.5">
                {/* Missing Game Recovery Cards */}
                {missingGames.slice(0, 3).map(({ game: mg }) => (
                  <Card
                    key={`missing-${mg.id}`}
                    className="overflow-hidden border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-card to-card"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10 border border-amber-500/20">
                          <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">vs {mg.opponent}</span>
                            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-bold uppercase gap-1">
                              <AlertCircle className="w-3 h-3" />⚠ Missing Stats
                             </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(mg.date), 'MMM d')} {mg.time ? `• ${mg.time}` : ''} {mg.location ? `• ${mg.location}` : ''}
                          </p>
                        </div>
                        <AddGameDialog
                          onAddGame={addGame}
                          isMobile={isMobile}
                          prefill={{
                            date: new Date(mg.date),
                            opponent: mg.opponent,
                            teamId: mg.teamId,
                            scheduledGameId: mg.id,
                          }}
                          customTrigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 text-xs font-semibold shrink-0 h-8"
                            >
                              Log Game
                            </Button>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Logged Games */}
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
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-xs"
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
                              <span className="font-semibold text-sm truncate">vs {game.opponent}</span>
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                game.isWin 
                                  ? "bg-green-500/10 text-green-500" 
                                  : "bg-red-500/10 text-red-500"
                              )}>
                                {game.isWin ? 'W' : 'L'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {game.points} PTS • {game.rebounds} REB • {game.assists} AST
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(game.date), 'MMM d')}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Full Game History (if more than 5 games) */}
          {games.length > 5 && (
            <section className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All Games
                </h2>
                {teams.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Select value={gamesTabTeamFilter} onValueChange={setGamesTabTeamFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <Users className="w-3 h-3 mr-1.5 text-muted-foreground" />
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
                      <Button variant="ghost" size="icon" onClick={() => setGamesTabTeamFilter('all')} className="h-8 w-8">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{gamesTabFilteredGames.length} games recorded</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            </section>
          )}
        </TabsContent>

        {/* ===================== CALENDAR TAB ===================== */}
        <TabsContent value="schedule" className="mt-5 space-y-5">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Calendar</h2>
              <p className="text-xs text-muted-foreground">Your game schedule and game days.</p>
            </div>
            <div className="flex gap-2">
              <ImportScheduleDialog onImport={bulkImportScheduledGames} isMobile={isMobile} />
              <AddScheduleDialog onAddGame={addScheduledGame} onBulkAddGames={bulkImportScheduledGames} isMobile={isMobile} />
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="text-base font-bold min-w-[160px] text-center">
              {format(calendarMonth, 'MMMM yyyy')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Filters */}
          {(teams.length > 1 || tournaments.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {teams.length > 1 && (
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <Users className="w-3 h-3 mr-1.5 text-muted-foreground" />
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
              )}
              {tournaments.length > 0 && (
                <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <Trophy className="w-3 h-3 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {tournaments.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Game Day Timeline */}
          {calendarGames.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-6 text-center space-y-3">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No games on your calendar yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add upcoming games to build your season schedule.
                  </p>
                </div>
                <AddScheduleDialog onAddGame={addScheduledGame} onBulkAddGames={bulkImportScheduledGames} isMobile={isMobile} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {calendarGames.map((group) => {
                const groupDate = new Date(group.date);
                const isTodayGroup = isToday(groupDate);
                
                return (
                  <div key={group.date} className="space-y-2">
                    {/* Date Header */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "text-[11px] font-bold uppercase tracking-wider",
                        isTodayGroup ? "text-primary" : "text-muted-foreground"
                      )}>
                        {isTodayGroup ? 'Today' : format(groupDate, 'EEE • MMM d')}
                      </div>
                      <div className="flex-1 h-px bg-border/50" />
                      {group.tournament && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Trophy className="w-3 h-3" />
                          {group.tournament}
                        </Badge>
                      )}
                    </div>

                    {/* Game Cards */}
                    {group.games.map((game, idx) => (
                      <Card
                        key={game.id}
                        className={cn(
                          "overflow-hidden transition-all cursor-pointer",
                          isTodayGroup 
                            ? "border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card hover:border-primary/40" 
                            : "border-border/50 hover:border-border",
                          game.status === 'stats_missing' && "border-amber-500/20"
                        )}
                        onClick={() => {
                          if (game.linkedGame) {
                            navigate(`/game/${game.linkedGame.id}`);
                          } else {
                            navigate(`/game/scheduled/${game.id}`);
                          }
                        }}
                      >
                        <CardContent className="p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {group.games.length > 1 && (
                                  <span className="text-[10px] font-bold text-muted-foreground">Game {idx + 1}</span>
                                )}
                                {getStatusBadge(game.status)}
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                  game.isHome 
                                    ? "bg-green-500/10 text-green-500" 
                                    : "bg-blue-500/10 text-blue-500"
                                )}>
                                  {game.isHome ? 'Home' : 'Away'}
                                </span>
                              </div>
                              <h3 className="font-bold text-sm truncate">🏀 vs {game.opponent}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {game.time}
                                </span>
                                {game.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">{game.location}</span>
                                  </span>
                                )}
                              </div>
                              {game.linkedGame && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                    game.linkedGame.isWin 
                                      ? "bg-green-500/10 text-green-500" 
                                      : "bg-red-500/10 text-red-500"
                                  )}>
                                    {game.linkedGame.isWin ? 'W' : 'L'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {game.linkedGame.points} PTS • {game.linkedGame.rebounds} REB • {game.linkedGame.assists} AST
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {(game.status === 'game_day' || game.status === 'live') && (
                                <Button
                                  onClick={(e) => { e.stopPropagation(); handleStartQuickCapture(game.opponent, game.id, game.teamId); }}
                                  size="sm"
                                  className="gradient-primary gap-1 text-[11px] font-semibold h-8"
                                >
                                  <Radio className="w-3 h-3" />
                                  {game.status === 'live' ? 'Resume Live Game' : 'Start Live Game'}
                                </Button>
                              )}
                              {game.status === 'stats_missing' && (
                                <AddGameDialog
                                  onAddGame={addGame}
                                  isMobile={isMobile}
                                  prefill={{
                                    date: new Date(game.date),
                                    opponent: game.opponent,
                                    teamId: game.teamId,
                                    scheduledGameId: game.id,
                                  }}
                                  customTrigger={
                                    <Button
                                      onClick={(e) => { e.stopPropagation(); }}
                                      variant="outline"
                                      size="sm"
                                      className="text-amber-500 border-amber-500/30 text-[11px] h-8"
                                    >
                                      Log Game
                                    </Button>
                                  }
                                />
                              )}
                              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini Calendar */}
          <section className="pt-4 border-t border-border/50">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Month View
            </h3>
            <ScheduleCalendar 
              games={filteredSchedule} 
              playedGames={games} 
              onAddGame={addScheduledGame}
              onUpdateGame={updateScheduledGame}
              onBulkAddGames={bulkImportScheduledGames}
            />
          </section>
        </TabsContent>

        {/* ===================== ADD GAME TAB ===================== */}
        <TabsContent value="add" className="mt-5">
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">Add a New Game</h2>
              <p className="text-sm text-muted-foreground">Choose how you want to log your game</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              <Card className="overflow-hidden border-primary/20 hover:border-primary/30 transition-all">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Radio className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Live Stats</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Track in real-time during the game</p>
                  </div>
                  <Button onClick={handleQuickLiveStatsClick} className="gradient-primary w-full text-sm">
                    Start Live Tracking
                  </Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/60 hover:border-border transition-all">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mx-auto">
                    <ClipboardList className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Log Game</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter stats after the game</p>
                  </div>
                  <AddGameDialog onAddGame={addGame} isMobile={isMobile} />
                </CardContent>
              </Card>
            </div>

            <div className="pt-4 border-t border-border/50 text-center space-y-3">
              <p className="text-xs text-muted-foreground">Want to add a game to your calendar schedule?</p>
              <AddScheduleDialog 
                onAddGame={addScheduledGame} 
                onBulkAddGames={bulkImportScheduledGames} 
                isMobile={isMobile} 
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
