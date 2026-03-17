import { useParams, useNavigate, Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGameWithMilestones } from '@/hooks/useGameWithMilestones';
import { MilestoneReveal } from '@/components/milestones/MilestoneReveal';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GameStatsForm } from '@/components/GameStatsForm';
import { LiveStatCapture, LiveStatsSaveData } from '@/components/LiveStatCapture';
import { PostGameRecap } from '@/components/PostGameRecap';
import { PostGameTalk } from '@/components/PostGameTalk';
import { PregameTalk } from '@/components/PregameTalk';
import { PregamePredictor } from '@/components/PregamePredictor';
import { GameCountdown } from '@/components/GameCountdown';
import { DailyQuote } from '@/components/DailyQuote';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { SeasonAveragesCard } from '@/components/SeasonAveragesCard';
import { EditScheduleDialog } from '@/components/EditScheduleDialog';
import { exportGameBoxScorePdf } from '@/utils/exportPdf';
import { calculateGameScore } from '@/utils/gameGrading';
import { usePlan } from '@/hooks/usePlanState';
import { canUseFeature } from '@/lib/plans';
import { ArrowLeft, Loader2, Trophy, Target, Repeat, Zap, Shield, HandMetal, AlertCircle, Calendar, MapPin, Home, Plane, Plus, Radio, FileDown, Pencil, Copy, Camera, ImageIcon, Trash2, Users, Check, Share2, Lock } from 'lucide-react';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { QuickDuplicateDialog } from '@/components/QuickDuplicateDialog';
import { MilestoneCard } from '@/components/milestones/MilestoneCard';
import { GamePerformanceCard } from '@/components/xp/GamePerformanceCard';
import { GameReportCard } from '@/components/GameReportCard';
import { CareerHighCelebration } from '@/components/stats/CareerHighCelebration';
import { detectNewCareerHighs, type CareerHigh } from '@/utils/statsCalculations';
import { InsightCard } from '@/components/insights/InsightCard';
import { useCloudData } from '@/hooks/useCloudData';
import { usePostGameInsights } from '@/hooks/usePostGameInsights';
import { generatePostGameInsight } from '@/utils/postGameInsights';
import { toast } from 'sonner';

export default function GameDetail() {
  const { id, scheduledId } = useParams<{ id?: string; scheduledId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const { 
    profile, 
    seasonStats, 
    activeSeason, 
    updateScheduledGame, 
    deleteScheduledGame,
    addScheduledGame,
    addGame,
    pendingMilestones,
    showReveal,
    closeReveal,
    earnedMilestones,
    getOccurrenceCount,
  } = useGameWithMilestones();
  const { teams } = usePlayerTeams();
  const { currentPlan, openPaywall, canGenerateReportCard, incrementReportCards, canExportPdf, incrementPdfExports } = usePlan();
  const { games: allGames } = useCloudData();
  const insightsHook = usePostGameInsights(allGames);
  const [lastSavedGameId, setLastSavedGameId] = useState<string | null>(null);
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
  const [includeMilestonesInPdf, setIncludeMilestonesInPdf] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showDeletePhotoDialog, setShowDeletePhotoDialog] = useState(false);
  const [showReportCard, setShowReportCard] = useState(false);
  const [newCareerHighs, setNewCareerHighs] = useState<CareerHigh[]>([]);
  const [showCareerHighCelebration, setShowCareerHighCelebration] = useState(false);
  const [showDeleteScheduledDialog, setShowDeleteScheduledDialog] = useState(false);

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
            .select('*, player_teams(name)')
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
              teamId: data.team_id || undefined,
              teamName: (data.player_teams as any)?.name || undefined,
              halftimeScoreUs: data.halftime_score_us ?? undefined,
              halftimeScoreThem: data.halftime_score_them ?? undefined,
              finalScoreUs: data.final_score_us ?? undefined,
              finalScoreThem: data.final_score_them ?? undefined,
            });
          } else {
            setError('Game not found');
          }
        }
        
        // If we have a scheduled game ID, fetch scheduled game info
        if (scheduledId) {
          const { data, error: fetchError } = await supabase
            .from('scheduled_games')
            .select('*, player_teams(name)')
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
              teamId: data.team_id || undefined,
              teamName: (data.player_teams as any)?.name || undefined,
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

  // Detect if current game holds any career highs
  useEffect(() => {
    if (game && allGames.length > 0) {
      const highs = detectNewCareerHighs(game, allGames);
      setNewCareerHighs(highs);
    }
  }, [game?.id, allGames.length]);

  const handleAddGame = async (gameData: Omit<GameStats, 'id'>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Use milestone-aware addGame from hook
      const savedGame = await addGame(gameData);

      if (savedGame) {
        setLastSavedGameId(savedGame.id);
        toast.success('Game stats saved!');
        setShowAddStatsDialog(false);
        setShowLiveCapture(false);
        
        // Detect new career highs
        const gamesWithNew = [...allGames.filter(g => g.id !== savedGame.id), savedGame];
        const highs = detectNewCareerHighs(savedGame, gamesWithNew);
        if (highs.length > 0) {
          setNewCareerHighs(highs);
          setShowCareerHighCelebration(true);
        }
        
        // Navigate to the new game detail page (but don't navigate if milestones are showing)
        // The milestone reveal will handle navigation when closed
        if (!showReveal) {
          navigate(`/game/${savedGame.id}`, { replace: true });
        }
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
    return <LoadingSpinner fullScreen size="lg" />;
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
              halftime_score_us: saveData?.halftimeScore?.us ?? null,
              halftime_score_them: saveData?.halftimeScore?.them ?? null,
              final_score_us: saveData?.finalScore?.us ?? null,
              final_score_them: saveData?.finalScore?.them ?? null,
              game_score: calculateGameScore(gameData),
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
              halftimeScoreUs: data.halftime_score_us ?? undefined,
              halftimeScoreThem: data.halftime_score_them ?? undefined,
              finalScoreUs: data.final_score_us ?? undefined,
              finalScoreThem: data.final_score_them ?? undefined,
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
              halftime_score_us: saveData?.halftimeScore?.us ?? null,
              halftime_score_them: saveData?.halftimeScore?.them ?? null,
              final_score_us: saveData?.finalScore?.us ?? null,
              final_score_them: saveData?.finalScore?.them ?? null,
              game_score: calculateGameScore(gameData),
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
              halftime_score_us: saveData?.halftimeScore?.us ?? null,
              halftime_score_them: saveData?.halftimeScore?.them ?? null,
              final_score_us: saveData?.finalScore?.us ?? null,
              final_score_them: saveData?.finalScore?.them ?? null,
              game_score: calculateGameScore(gameData),
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
            halftimeScoreUs: data.halftime_score_us ?? undefined,
            halftimeScoreThem: data.halftime_score_them ?? undefined,
            finalScoreUs: data.final_score_us ?? undefined,
            finalScoreThem: data.final_score_them ?? undefined,
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
    track('pdf_export_attempted', { gameId: game?.id, plan: currentPlan });
    
    // Check if free user has hit the export limit
    if (!canExportPdf()) {
      track('pdf_export_blocked', { gameId: game?.id, plan: currentPlan });
      openPaywall('pdf_export_limit');
      return;
    }
    
    if (!game || !profile) {
      toast.error('Cannot export: missing game or profile data');
      return;
    }
    
    const isFreeUser = currentPlan === 'free';
    
    // Get milestones earned in this game for PDF
    const gameMilestones = earnedMilestones
      .filter(m => m.gameId === game.id && m.milestone)
      .map(m => ({
        milestone: m.milestone!,
        earnedAt: m.earnedAt,
      }));
    
    toast.info('Generating Official Game Report...');
    await exportGameBoxScorePdf(profile, {
      game,
      firstHalf: halfData?.firstHalf,
      secondHalf: halfData?.secondHalf,
      coachRecap: includeRecapInPdf ? coachRecap : undefined,
      milestones: includeMilestonesInPdf && gameMilestones.length > 0 ? gameMilestones : undefined,
    }, { isFreeUser });
    
    // Increment counter after successful export
    await incrementPdfExports();
    track('pdf_export_completed', { gameId: game.id, plan: currentPlan, isFreeUser });
    toast.success('Official Game Report exported!');
  };

  // Handle game photo capture/update
  const handleGamePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !game || !user) return;

    setIsUploadingPhoto(true);
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Reusing avatars bucket for game photos
        .upload(`game-photos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(`game-photos/${fileName}`);

      // Update the game with the new photo URL
      const { error: updateError } = await supabase
        .from('games')
        .update({ game_photo_url: publicUrl })
        .eq('id', game.id);

      if (updateError) throw updateError;

      // Update local state
      setGame(prev => prev ? { ...prev, gamePhotoUrl: publicUrl } : null);
      toast.success('Game photo updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset the input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  // Handle game photo removal
  const handleRemovePhoto = async () => {
    if (!game || !user) return;

    try {
      // Update the game to remove the photo URL
      const { error: updateError } = await supabase
        .from('games')
        .update({ game_photo_url: null })
        .eq('id', game.id);

      if (updateError) throw updateError;

      // Update local state
      setGame(prev => prev ? { ...prev, gamePhotoUrl: undefined } : null);
      toast.success('Game photo removed');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    }
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
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
                {scheduledGame.teamName && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3" />
                    {scheduledGame.teamName}
                  </Badge>
                )}
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDeleteScheduledDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
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
              {/* Team Assignment */}
              {teams.length > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">I am playing this game with</span>
                  <Select
                    value={scheduledGame.teamId || 'unassigned'}
                    onValueChange={async (value) => {
                      const newTeamId = value === 'unassigned' ? null : value;
                      const teamName = teams.find(t => t.id === value)?.name || undefined;
                      const result = await updateScheduledGame(scheduledGame.id, { 
                        teamId: newTeamId || undefined 
                      });
                      if (result) {
                        setScheduledGame({
                          ...result,
                          teamName: teamName,
                        });
                        toast.success('Team updated!');
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-sm">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">Unassigned</span>
                      </SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                          {team.is_primary && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

          {/* Delete Scheduled Game Confirmation */}
          <AlertDialog open={showDeleteScheduledDialog} onOpenChange={setShowDeleteScheduledDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this game?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the scheduled game vs {scheduledGame.opponent}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    await deleteScheduledGame(scheduledGame.id);
                    toast.success('Game deleted');
                    navigate('/');
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
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

  // Calculate TOTAL field goals (2PT + 3PT combined) for display
  const totalFgMade = game.fgMade + game.threePtMade;
  const totalFgAttempted = game.fgAttempted + game.threePtAttempted;
  const totalFgPct = totalFgAttempted > 0 ? Math.round((totalFgMade / totalFgAttempted) * 100) : 0;
  const threePct = game.threePtAttempted > 0 ? Math.round((game.threePtMade / game.threePtAttempted) * 100) : 0;
  const ftPct = game.ftAttempted > 0 ? Math.round((game.ftMade / game.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
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
              {game.teamName && (
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3" />
                  {game.teamName}
                </Badge>
              )}
              <span className="text-muted-foreground">
                {format(new Date(game.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <h1 className="text-3xl font-bold">vs {game.opponent}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Hidden file input for photo capture */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
              
              onChange={handleGamePhotoCapture}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className={cn(game.gamePhotoUrl && "text-green-500")}
              size={isMobile ? "icon" : "default"}
              title={game.gamePhotoUrl ? 'Update Photo' : 'Add Photo'}
            >
              {isUploadingPhoto ? (
                <Loader2 className={cn("w-4 h-4 animate-spin", !isMobile && "mr-2")} />
              ) : game.gamePhotoUrl ? (
                <ImageIcon className={cn("w-4 h-4", !isMobile && "mr-2")} />
              ) : (
                <Camera className={cn("w-4 h-4", !isMobile && "mr-2")} />
              )}
              {!isMobile && (game.gamePhotoUrl ? 'Update Photo' : 'Add Photo')}
              {isMobile && <span className="sr-only">{game.gamePhotoUrl ? 'Update Photo' : 'Add Photo'}</span>}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowLiveCapture(true)}
              size={isMobile ? "icon" : "default"}
              title="Resume Live Stats"
            >
              <Radio className={cn("w-4 h-4", !isMobile && "mr-2")} />
              {!isMobile && "Resume Live Stats"}
              {isMobile && <span className="sr-only">Resume Live Stats</span>}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportPdf}
              size={isMobile ? "icon" : "default"}
              title="Export PDF"
            >
              <FileDown className={cn("w-4 h-4", !isMobile && "mr-2")} />
              {!isMobile && "Export PDF"}
              {isMobile && <span className="sr-only">Export PDF</span>}
            </Button>
            <Button 
              onClick={() => {
                if (!canGenerateReportCard()) {
                  openPaywall('report_card_limit');
                  return;
                }
                if (!canUseFeature(currentPlan, 'reportCard')) {
                  openPaywall('report_card');
                  return;
                }
                incrementReportCards();
                setShowReportCard(true);
              }}
              size={isMobile ? "icon" : "default"}
              title="Share Report Card"
              className="gradient-primary"
            >
              {!canGenerateReportCard() ? (
                <Lock className={cn("w-4 h-4", !isMobile && "mr-2")} />
              ) : (
                <Share2 className={cn("w-4 h-4", !isMobile && "mr-2")} />
              )}
              {!isMobile && (!canGenerateReportCard() ? "Upgrade to Share" : "Report Card")}
              {isMobile && <span className="sr-only">Report Card</span>}
            </Button>
          </div>
        </div>

        {/* Game Photo */}
        {game.gamePhotoUrl && (
          <div className="stat-card mb-6 p-0 overflow-hidden relative">
            <img 
              src={game.gamePhotoUrl} 
              alt={`Game vs ${game.opponent}`}
              className="w-full h-48 md:h-64 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 w-8 h-8"
              onClick={() => setShowDeletePhotoDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <AlertDialog open={showDeletePhotoDialog} onOpenChange={setShowDeletePhotoDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Game Photo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the photo from this game. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      handleRemovePhoto();
                      setShowDeletePhotoDialog(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="p-3 text-center text-sm text-muted-foreground">
              📸 Game Day Photo
            </div>
          </div>
        )}

        {/* Team Scores Display */}
        {(game.finalScoreUs !== undefined || game.halftimeScoreUs !== undefined) && (
          <div className="stat-card mb-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Team Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Final Score */}
              {game.finalScoreUs !== undefined && game.finalScoreThem !== undefined && (
                <div className="text-center p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Final Score</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{game.finalScoreUs}</p>
                      <p className="text-xs text-muted-foreground">Us</p>
                    </div>
                    <span className="text-muted-foreground text-lg">-</span>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{game.finalScoreThem}</p>
                      <p className="text-xs text-muted-foreground">Them</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Halftime Score */}
              {game.halftimeScoreUs !== undefined && game.halftimeScoreThem !== undefined && (
                <div className="text-center p-4 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Halftime</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{game.halftimeScoreUs}</p>
                      <p className="text-xs text-muted-foreground">Us</p>
                    </div>
                    <span className="text-muted-foreground text-lg">-</span>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{game.halftimeScoreThem}</p>
                      <p className="text-xs text-muted-foreground">Them</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Points Highlight */}
        <div className="stat-card mb-6 text-center py-8 gradient-primary rounded-xl">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-primary-foreground/80" />
          <p className="text-6xl font-bold text-primary-foreground">{game.points}</p>
          <p className="text-primary-foreground/80 uppercase tracking-wider text-sm mt-1">Points Scored</p>
        </div>

        {/* Post Game Report - Consolidated Stats and Milestones */}
        <div className="stat-card mb-6">
          <h2 className="text-xl font-bold mb-6">Post Game Report</h2>
          
          {/* Shooting Performance */}
          <h3 className="text-lg font-semibold mb-4">Shooting Performance</h3>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <ShootingStatBox
              label="Field Goals"
              made={totalFgMade}
              attempted={totalFgAttempted}
              percentage={totalFgPct}
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

          {/* Performance Stats */}
          <h3 className="text-lg font-semibold mb-4">Performance Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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

          {/* Game Summary */}
          <h3 className="text-lg font-semibold mb-4">Game Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Personal Fouls</p>
              <p className="text-2xl font-bold">{game.fouls ?? 0}</p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Efficiency</p>
              <p className="text-2xl font-bold">
                {game.points + game.rebounds + game.assists + game.steals + game.blocks - game.turnovers}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">True Shooting</p>
              <p className="text-2xl font-bold">
                {totalFgAttempted + (0.44 * game.ftAttempted) > 0
                  ? Math.round((game.points / (2 * (totalFgAttempted + 0.44 * game.ftAttempted))) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Career High Celebration (post-save) */}
          {showCareerHighCelebration && newCareerHighs.length > 0 && (
            <CareerHighCelebration
              newHighs={newCareerHighs}
              onDismiss={() => setShowCareerHighCelebration(false)}
            />
          )}

          {/* Career High Badges (existing game view) */}
          {!showCareerHighCelebration && newCareerHighs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {newCareerHighs.map(h => (
                <Badge key={h.stat} variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
                  <Trophy className="h-3 w-3" />
                  Career High: {h.stat} ({h.displayValue})
                </Badge>
              ))}
            </div>
          )}

          {/* XP Performance Score */}
          <GamePerformanceCard game={game} className="mb-6 border-0 shadow-none p-0" />

          {/* Post-Game Insight */}
          {(() => {
            const storedInsight = insightsHook.getInsightForGame(game.id);
            const insight = storedInsight
              ? { type: storedInsight.type, title: storedInsight.title, body: storedInsight.body, statCallout: storedInsight.statCallout || undefined, icon: '' }
              : (allGames.length > 0 ? generatePostGameInsight(game, allGames) : null);
            if (!insight) return null;
            return (
              <div className="mb-6">
                <InsightCard
                  insight={insight as any}
                  animate={false}
                  isNew={storedInsight ? !storedInsight.isSeen : false}
                  onView={() => storedInsight && !storedInsight.isSeen && insightsHook.markInsightSeen(storedInsight.id)}
                />
              </div>
            );
          })()}

          {/* Milestones Earned in This Game */}
          {earnedMilestones.filter(m => m.gameId === game.id).length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Milestones Earned
                </h3>
                <div className="flex items-center gap-2">
                  <Switch
                    id="include-milestones-pdf"
                    checked={includeMilestonesInPdf}
                    onCheckedChange={setIncludeMilestonesInPdf}
                  />
                  <Label htmlFor="include-milestones-pdf" className="text-sm text-muted-foreground">
                    Include in PDF
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {earnedMilestones
                  .filter(m => m.gameId === game.id)
                  .map((earned) => {
                    const count = getOccurrenceCount(earned.milestoneId);
                    return (
                      earned.milestone && (
                        <MilestoneCard
                          key={earned.id}
                          milestone={earned.milestone}
                          earnedAt={earned.earnedAt}
                          statsSnapshot={earned.statsSnapshot}
                          gameOpponent={game.opponent}
                          isEarned={true}
                          occurrenceCount={count}
                        />
                      )
                    );
                  })}
              </div>
            </>
          )}
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
          playerName={profile?.name}
          playerTeam={profile?.team}
          parentEmail={profile?.parentEmail}
          receiveGameSummaries={profile?.receiveGameSummaries}
          courtRole={profile?.courtRole}
          seasonGoals={profile?.seasonGoals}
        />

        {/* Post Game Talk - Reflection with Coach AI */}
        <PostGameTalk 
          game={game}
          seasonId={activeSeason?.id}
        />
      </div>

      {/* Milestone Reveal Modal */}
      {showReveal && pendingMilestones.length > 0 && (
        <MilestoneReveal
          milestones={pendingMilestones.map(m => ({
            milestone: m.milestone,
            statsSnapshot: m.statsSnapshot,
            gameId: lastSavedGameId || undefined,
          }))}
          onComplete={() => {
            closeReveal();
            // Navigate to game detail after closing reveal
            if (lastSavedGameId && !id) {
              navigate(`/game/${lastSavedGameId}`, { replace: true });
            }
          }}
        />
      )}

      {/* Game Report Card */}
      <GameReportCard
        open={showReportCard}
        onOpenChange={setShowReportCard}
        game={game}
        playerName={profile?.displayName || profile?.name || 'Player'}
        playerTeam={game.teamName || profile?.team || ''}
        avatarUrl={profile?.avatar}
        allGames={allGames}
      />
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
