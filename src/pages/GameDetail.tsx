import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCloudData } from '@/hooks/useCloudData';
import { useMilestones } from '@/hooks/useMilestones';
import { GameStats, ScheduledGame } from '@/types/basketball';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GameStatsForm } from '@/components/GameStatsForm';
import { LiveStatCapture, LiveStatsSaveData } from '@/components/LiveStatCapture';
import { PostGameRecap } from '@/components/PostGameRecap';
import { PregameTalk } from '@/components/PregameTalk';
import { PregamePredictor } from '@/components/PregamePredictor';
import { GameCountdown } from '@/components/GameCountdown';
import { DailyQuote } from '@/components/DailyQuote';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { SeasonAveragesCard } from '@/components/SeasonAveragesCard';
import { EditScheduleDialog } from '@/components/EditScheduleDialog';
import { exportGameBoxScorePdf } from '@/utils/exportPdf';
import { ArrowLeft, Loader2, Trophy, Target, Repeat, Zap, Shield, HandMetal, AlertCircle, Calendar, MapPin, Home, Plane, Plus, Radio, FileDown, Pencil, Copy } from 'lucide-react';
import { QuickDuplicateDialog } from '@/components/QuickDuplicateDialog';
import { toast } from 'sonner';

export default function GameDetail() {
  const { id, scheduledId } = useParams<{ id?: string; scheduledId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, seasonStats, activeSeason, updateScheduledGame, addScheduledGame } = useCloudData();
  const { earnedMilestones } = useMilestones(activeSeason?.id);
  const [game, setGame] = useState<GameStats | null>(null);
  const [scheduledGame, setScheduledGame] = useState<ScheduledGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStatsDialog, setShowAddStatsDialog] = useState(false);
  const [showLiveCapture, setShowLiveCapture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [halfData, setHalfData] = useState<LiveStatsSaveData | null>(null);
  const [coachRecap, setCoachRecap] = useState<string | null>(null);
  const [includeRecapInPdf, setIncludeRecapInPdf] = useState(false);

  const handleRecapChange = useCallback((recap: string | null, includeInPdf: boolean) => {
    setCoachRecap(recap);
    setIncludeRecapInPdf(includeInPdf);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // If we have a game ID, try to fetch recorded stats
        if (id) {
          const { data, error: fetchError } = await supabase
            .from('games')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (data) {
            setGame({
              id: data.id,
              date: data.date,
              opponent: data.opponent,
              points: data.points,
              rebounds: data.rebounds,
              assists: data.assists,
              steals: data.steals,
              blocks: data.blocks,
              turnovers: data.turnovers,
              fouls: data.fouls ?? 0,
              minutesPlayed: data.minutes_played,
              fgMade: data.fg_made,
              fgAttempted: data.fg_attempted,
              threePtMade: data.three_pt_made,
              threePtAttempted: data.three_pt_attempted,
              ftMade: data.ft_made,
              ftAttempted: data.ft_attempted,
              isWin: data.is_win,
              gamePhotoUrl: data.game_photo_url,
            });
          } else {
            setError('Game not found');
          }
        }
        
        // If we have a scheduled game ID, fetch scheduled game info
        if (scheduledId) {
          const { data, error: fetchError } = await supabase
            .from('scheduled_games')
            .select('*')
            .eq('id', scheduledId)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (data) {
            setScheduledGame({
              id: data.id,
              date: data.date,
              time: data.time,
              opponent: data.opponent,
              location: data.location,
              isHome: data.is_home,
              notes: data.notes || undefined,
              tournament: (data as any).tournament || undefined,
            });
          } else {
            setError('Scheduled game not found');
          }
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [id, scheduledId, user, authLoading]);

  const handleAddGame = async (gameData: Omit<GameStats, 'id'>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('games')
        .insert({
          user_id: user.id,
          season_id: activeSeason?.id || null,
          date: gameData.date,
          opponent: gameData.opponent,
          points: gameData.points,
          rebounds: gameData.rebounds,
          assists: gameData.assists,
          steals: gameData.steals,
          blocks: gameData.blocks,
          turnovers: gameData.turnovers,
          fouls: gameData.fouls ?? 0,
          minutes_played: gameData.minutesPlayed,
          fg_made: gameData.fgMade,
          fg_attempted: gameData.fgAttempted,
          three_pt_made: gameData.threePtMade,
          three_pt_attempted: gameData.threePtAttempted,
          ft_made: gameData.ftMade,
          ft_attempted: gameData.ftAttempted,
          is_win: gameData.isWin,
          game_photo_url: gameData.gamePhotoUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Game stats saved!');
      setShowAddStatsDialog(false);
      setShowLiveCapture(false);
      
      // Navigate to the new game detail page
      if (data) {
        navigate(`/game/${data.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Error adding game:', err);
      toast.error('Failed to save game stats');
      setShowLiveCapture(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  // Handle live stat capture save
  const handleLiveCaptureSave = async (
    liveStats: {
      points: number;
      fgMade: number;
      fgAttempted: number;
      threePtMade: number;
      threePtAttempted: number;
      ftMade: number;
      ftAttempted: number;
      rebounds: number;
      offensiveRebounds: number;
      defensiveRebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fouls: number;
    },
    saveData?: LiveStatsSaveData,
    isGameOver?: boolean
  ) => {
    // Store half data for PDF export
    if (saveData) {
      setHalfData(saveData);
    }
    
    const gameData: Omit<GameStats, 'id'> = {
      date: scheduledGame?.date || new Date().toISOString(),
      opponent: scheduledGame?.opponent || game?.opponent || 'Unknown',
      points: liveStats.points,
      rebounds: liveStats.rebounds,
      assists: liveStats.assists,
      steals: liveStats.steals,
      blocks: liveStats.blocks,
      turnovers: liveStats.turnovers,
      fouls: liveStats.fouls ?? 0,
      minutesPlayed: 0, // Can be updated later
      fgMade: liveStats.fgMade,
      fgAttempted: liveStats.fgAttempted,
      threePtMade: liveStats.threePtMade,
      threePtAttempted: liveStats.threePtAttempted,
      ftMade: liveStats.ftMade,
      ftAttempted: liveStats.ftAttempted,
      isWin: saveData?.isWin ?? false,
      offensiveRebounds: liveStats.offensiveRebounds,
      defensiveRebounds: liveStats.defensiveRebounds,
      gamePhotoUrl: saveData?.gamePhotoUrl,
    };
    
    if (isGameOver) {
      // Game is over - save/update and navigate to game recap
      if (game?.id) {
        // Update existing game
        setIsSubmitting(true);
        try {
          const { data, error: updateError } = await supabase
            .from('games')
            .update({
              points: gameData.points,
              rebounds: gameData.rebounds,
              assists: gameData.assists,
              steals: gameData.steals,
              blocks: gameData.blocks,
              turnovers: gameData.turnovers,
              fouls: gameData.fouls ?? 0,
              fg_made: gameData.fgMade,
              fg_attempted: gameData.fgAttempted,
              three_pt_made: gameData.threePtMade,
              three_pt_attempted: gameData.threePtAttempted,
              ft_made: gameData.ftMade,
              ft_attempted: gameData.ftAttempted,
              is_win: gameData.isWin,
              game_photo_url: gameData.gamePhotoUrl,
            })
            .eq('id', game.id)
            .select()
            .single();

          if (updateError) throw updateError;

          toast.success('Game stats saved!');
          setShowLiveCapture(false);
          
          if (data) {
            setGame({
              id: data.id,
              date: data.date,
              opponent: data.opponent,
              points: data.points,
              rebounds: data.rebounds,
              assists: data.assists,
              steals: data.steals,
              blocks: data.blocks,
              turnovers: data.turnovers,
              fouls: data.fouls ?? 0,
              minutesPlayed: data.minutes_played,
              fgMade: data.fg_made,
              fgAttempted: data.fg_attempted,
              threePtMade: data.three_pt_made,
              threePtAttempted: data.three_pt_attempted,
              ftMade: data.ft_made,
              ftAttempted: data.ft_attempted,
              isWin: data.is_win,
              gamePhotoUrl: data.game_photo_url,
            });
          }
        } catch (err) {
          console.error('Error updating game:', err);
          toast.error('Failed to save game stats');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Insert new game
        await handleAddGame(gameData);
      }
    } else {
      // Game not over - save stats but allow resuming later
      setIsSubmitting(true);
      try {
        let data;
        
        if (game?.id) {
          // Update existing game
          const { data: updateData, error: updateError } = await supabase
            .from('games')
            .update({
              points: gameData.points,
              rebounds: gameData.rebounds,
              assists: gameData.assists,
              steals: gameData.steals,
              blocks: gameData.blocks,
              turnovers: gameData.turnovers,
              fouls: gameData.fouls ?? 0,
              fg_made: gameData.fgMade,
              fg_attempted: gameData.fgAttempted,
              three_pt_made: gameData.threePtMade,
              three_pt_attempted: gameData.threePtAttempted,
              ft_made: gameData.ftMade,
              ft_attempted: gameData.ftAttempted,
              is_win: gameData.isWin,
              game_photo_url: gameData.gamePhotoUrl,
            })
            .eq('id', game.id)
            .select()
            .single();

          if (updateError) throw updateError;
          data = updateData;
        } else {
          // Insert new game
          const { data: insertData, error: insertError } = await supabase
            .from('games')
            .insert({
              user_id: user!.id,
              season_id: activeSeason?.id || null,
              date: gameData.date,
              opponent: gameData.opponent,
              points: gameData.points,
              rebounds: gameData.rebounds,
              assists: gameData.assists,
              steals: gameData.steals,
              blocks: gameData.blocks,
              turnovers: gameData.turnovers,
              fouls: gameData.fouls ?? 0,
              minutes_played: gameData.minutesPlayed,
              fg_made: gameData.fgMade,
              fg_attempted: gameData.fgAttempted,
              three_pt_made: gameData.threePtMade,
              three_pt_attempted: gameData.threePtAttempted,
              ft_made: gameData.ftMade,
              ft_attempted: gameData.ftAttempted,
              is_win: gameData.isWin,
              game_photo_url: gameData.gamePhotoUrl,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          data = insertData;
        }

        toast.success('Stats saved! You can resume tracking later.');
        setShowLiveCapture(false);
        
        // Update the game state to reflect saved stats
        if (data) {
          setGame({
            id: data.id,
            date: data.date,
            opponent: data.opponent,
            points: data.points,
            rebounds: data.rebounds,
            assists: data.assists,
            steals: data.steals,
            blocks: data.blocks,
            turnovers: data.turnovers,
            fouls: data.fouls ?? 0,
            minutesPlayed: data.minutes_played,
            fgMade: data.fg_made,
            fgAttempted: data.fg_attempted,
            threePtMade: data.three_pt_made,
            threePtAttempted: data.three_pt_attempted,
            ftMade: data.ft_made,
            ftAttempted: data.ft_attempted,
            isWin: data.is_win,
            gamePhotoUrl: data.game_photo_url,
          });
          // Update URL to reflect the saved game (only if it was a new game)
          if (!game?.id) {
            navigate(`/game/${data.id}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Error saving game:', err);
        toast.error('Failed to save stats');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handle PDF export
  const handleExportPdf = async () => {
    if (!game || !profile) {
      toast.error('Cannot export: missing game or profile data');
      return;
    }
    
    toast.info('Generating PDF...');
    await exportGameBoxScorePdf(profile, {
      game,
      firstHalf: halfData?.firstHalf,
      secondHalf: halfData?.secondHalf,
      coachRecap: includeRecapInPdf ? coachRecap : undefined,
    });
    toast.success('Box score PDF exported!');
  };

  // Show Live Stat Capture fullscreen
  if (showLiveCapture) {
    const opponent = scheduledGame?.opponent || game?.opponent || 'Unknown';
    return (
      <LiveStatCapture
        opponent={opponent}
        initialStats={game ? {
          points: game.points,
          fgMade: game.fgMade,
          fgAttempted: game.fgAttempted,
          threePtMade: game.threePtMade,
          threePtAttempted: game.threePtAttempted,
          ftMade: game.ftMade,
          ftAttempted: game.ftAttempted,
          rebounds: game.rebounds,
          offensiveRebounds: game.offensiveRebounds || 0,
          defensiveRebounds: game.defensiveRebounds || 0,
          assists: game.assists,
          steals: game.steals,
          blocks: game.blocks,
          turnovers: game.turnovers,
          fouls: game.fouls || 0,
        } : undefined}
        onSave={handleLiveCaptureSave}
        onCancel={() => setShowLiveCapture(false)}
        isSaving={isSubmitting}
      />
    );
  }

  // Show scheduled game view (no stats yet)
  if (scheduledGame && !game) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-bold uppercase flex items-center gap-1',
                    scheduledGame.isHome
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {scheduledGame.isHome ? (
                    <>
                      <Home className="w-3 h-3" /> Home
                    </>
                  ) : (
                    <>
                      <Plane className="w-3 h-3" /> Away
                    </>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {format(new Date(scheduledGame.date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <h1 className="text-3xl font-bold">vs {scheduledGame.opponent}</h1>
            </div>
            <div className="flex gap-2">
              <EditScheduleDialog
                game={scheduledGame}
                onUpdate={async (id, updates) => {
                  const result = await updateScheduledGame(id, updates);
                  if (result) {
                    setScheduledGame(result);
                  }
                }}
                onAddGame={addScheduledGame}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                }
              />
              <QuickDuplicateDialog
                sourceGame={scheduledGame}
                onDuplicate={async (games) => {
                  for (const game of games) {
                    await addScheduledGame(game);
                  }
                }}
                trigger={
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </Button>
                }
              />
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="stat-card mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Time Until Tipoff
              </h2>
            </div>
            <GameCountdown gameDate={scheduledGame.date} gameTime={scheduledGame.time} />
          </div>

          {/* Daily Motivational Quote */}
          <div className="mb-6">
            <DailyQuote />
          </div>

          {/* Game Info */}
          <div className="stat-card mb-6">
            <h2 className="text-lg font-semibold mb-4">Game Details</h2>
            <div className="space-y-3">
              {scheduledGame.tournament && (
                <div className="flex items-center gap-3 text-primary font-medium">
                  <Trophy className="w-5 h-5" />
                  <span>Tag: {scheduledGame.tournament}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span>{format(new Date(scheduledGame.date), 'EEEE, MMMM d, yyyy')} at {scheduledGame.time}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5" />
                <span>{scheduledGame.location}</span>
              </div>
            </div>
            {scheduledGame.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{scheduledGame.notes}</p>
              </div>
            )}
          </div>

          {/* Game Actions - Primary CTA */}
          <div className="stat-card mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Ready for game time?</p>
                <p className="text-sm text-muted-foreground">
                  Track your stats live during the game
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowLiveCapture(true)} className="gradient-primary" size="lg">
                  <Radio className="w-4 h-4 mr-2" />
                  Live Stat Capture
                </Button>
                <Button onClick={() => setShowAddStatsDialog(true)} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Manual
                </Button>
              </div>
            </div>
          </div>

          {/* Pregame Content */}
          <div className="space-y-6">
            {/* Spotify Player - Theme Music */}
            {profile?.themeMusicUrl && (
              <SpotifyPlayer url={profile.themeMusicUrl} compact />
            )}

            {/* Pregame Talk - Coach AI - Full Width Primary */}
            <PregameTalk 
              opponent={scheduledGame.opponent}
              gameDate={scheduledGame.date}
              isHome={scheduledGame.isHome}
            />
            
            {/* Season Averages Card - Prominent Display */}
            <SeasonAveragesCard stats={seasonStats} compact />
            
            {/* Stats Predictor */}
            <PregamePredictor 
              scheduledGameId={scheduledGame.id}
              opponent={scheduledGame.opponent}
              compact
              seasonStats={seasonStats}
            />
          </div>

          {/* Add Stats Dialog */}
          <Dialog open={showAddStatsDialog} onOpenChange={setShowAddStatsDialog}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Log Game Stats</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <GameStatsForm
                  onSubmit={handleAddGame}
                  initialData={{
                    date: new Date(scheduledGame.date),
                    opponent: scheduledGame.opponent,
                  }}
                  submitLabel={isSubmitting ? 'Saving...' : 'Save Stats'}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="stat-card text-center py-16">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">{error || 'Game not found'}</p>
            <p className="text-muted-foreground mb-6">
              This game may not have been recorded yet. Log your stats after playing!
            </p>
            <Link to="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fgPct = game.fgAttempted > 0 ? Math.round((game.fgMade / game.fgAttempted) * 100) : 0;
  const threePct = game.threePtAttempted > 0 ? Math.round((game.threePtMade / game.threePtAttempted) * 100) : 0;
  const ftPct = game.ftAttempted > 0 ? Math.round((game.ftMade / game.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-bold uppercase',
                  game.isWin
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {game.isWin ? 'Victory' : 'Defeat'}
              </div>
              <span className="text-muted-foreground">
                {format(new Date(game.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <h1 className="text-3xl font-bold">vs {game.opponent}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLiveCapture(true)}>
              <Radio className="w-4 h-4 mr-2" />
              Resume Live Stats
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Game Photo */}
        {game.gamePhotoUrl && (
          <div className="stat-card mb-6 p-0 overflow-hidden">
            <img 
              src={game.gamePhotoUrl} 
              alt={`Game vs ${game.opponent}`}
              className="w-full h-48 md:h-64 object-cover"
            />
            <div className="p-3 text-center text-sm text-muted-foreground">
              📸 Game Day Photo
            </div>
          </div>
        )}

        {/* Points Highlight */}
        <div className="stat-card mb-6 text-center py-8 gradient-primary rounded-xl">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-primary-foreground/80" />
          <p className="text-6xl font-bold text-primary-foreground">{game.points}</p>
          <p className="text-primary-foreground/80 uppercase tracking-wider text-sm mt-1">Points Scored</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox icon={Repeat} label="Rebounds" value={game.rebounds} />
          <StatBox icon={Zap} label="Assists" value={game.assists} />
          <StatBox icon={Shield} label="Steals" value={game.steals} />
          <StatBox icon={HandMetal} label="Blocks" value={game.blocks} />
        </div>

        {/* Shooting Stats */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Shooting Performance</h2>
          <div className="grid grid-cols-3 gap-6">
            <ShootingStatBox
              label="Field Goals"
              made={game.fgMade}
              attempted={game.fgAttempted}
              percentage={fgPct}
            />
            <ShootingStatBox
              label="3-Pointers"
              made={game.threePtMade}
              attempted={game.threePtAttempted}
              percentage={threePct}
            />
            <ShootingStatBox
              label="Free Throws"
              made={game.ftMade}
              attempted={game.ftAttempted}
              percentage={ftPct}
            />
          </div>
        </div>

        {/* Other Stats */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Performance Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Repeat className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-3xl font-bold">{game.rebounds}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Rebounds</p>
              {(game.offensiveRebounds || game.defensiveRebounds) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {game.offensiveRebounds || 0}O / {game.defensiveRebounds || 0}D
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-3xl font-bold">{game.assists}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Assists</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-3xl font-bold">{game.steals}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Steals</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <HandMetal className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-3xl font-bold">{game.blocks}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Blocks</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <p className="text-3xl font-bold">{game.turnovers}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Turnovers</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <h2 className="text-lg font-semibold mb-4">Game Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Turnovers</p>
              <p className="text-2xl font-bold">{game.turnovers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Efficiency</p>
              <p className="text-2xl font-bold">
                {game.points + game.rebounds + game.assists + game.steals + game.blocks - game.turnovers}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">True Shooting</p>
              <p className="text-2xl font-bold">
                {game.fgAttempted + (0.44 * game.ftAttempted) > 0
                  ? Math.round((game.points / (2 * (game.fgAttempted + 0.44 * game.ftAttempted))) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Post Game Recap from Coach AI */}
        <PostGameRecap 
          game={game} 
          earnedMilestones={
            earnedMilestones
              .filter(m => m.gameId === game.id)
              .map(m => ({ name: m.milestone?.name || '', rarity: m.milestone?.rarity || 'common' }))
          }
          onRecapChange={handleRecapChange} 
        />
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card text-center py-6">
      <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function ShootingStatBox({
  label,
  made,
  attempted,
  percentage,
}: {
  label: string;
  made: number;
  attempted: number;
  percentage: number;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold">
        {made}/{attempted}
      </p>
      <div className="mt-2">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm font-medium mt-1">{percentage}%</p>
      </div>
    </div>
  );
}
