import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Undo2, 
  Save, 
  Target, 
  Circle,
  Repeat,
  Zap,
  Shield,
  HandMetal,
  AlertCircle,
  X,
  Camera,
  ImageIcon,
  Trash2,
  UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FireCelebration } from './FireCelebration';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { HalfStats } from '@/types/basketball';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface LiveStats {
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
}

interface StatAction {
  type: keyof LiveStats;
  value: number;
  label: string;
  half: 1 | 2;
}

export interface LiveStatsSaveData {
  total: LiveStats;
  firstHalf: HalfStats;
  secondHalf: HalfStats;
  gamePhotoUrl?: string;
  isWin?: boolean;
}

interface LiveStatCaptureProps {
  opponent: string;
  initialStats?: Partial<LiveStats>;
  onSave: (stats: LiveStats, halfData?: LiveStatsSaveData, isGameOver?: boolean) => void;
  onCancel: () => void;
  isSaving?: boolean;
  onPhotoCapture?: (photoUrl: string) => void;
}

const defaultStats: LiveStats = {
  points: 0,
  fgMade: 0,
  fgAttempted: 0,
  threePtMade: 0,
  threePtAttempted: 0,
  ftMade: 0,
  ftAttempted: 0,
  rebounds: 0,
  offensiveRebounds: 0,
  defensiveRebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fouls: 0,
};

export function LiveStatCapture({ 
  opponent, 
  initialStats, 
  onSave, 
  onCancel,
  isSaving = false,
  onPhotoCapture
}: LiveStatCaptureProps) {
  const [currentHalf, setCurrentHalf] = useState<1 | 2>(1);
  const [firstHalfStats, setFirstHalfStats] = useState<LiveStats>({ ...defaultStats });
  const [secondHalfStats, setSecondHalfStats] = useState<LiveStats>({ ...defaultStats });
  const [history, setHistory] = useState<StatAction[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showFireCelebration, setShowFireCelebration] = useState(false);
  const [gamePhoto, setGamePhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playSound } = useSoundEffects();

  // Initialize with any passed initial stats (goes to first half)
  // Using a ref to track if we've initialized to prevent re-running on every render
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (initialStats && !hasInitialized.current) {
      hasInitialized.current = true;
      setFirstHalfStats(prev => ({ ...prev, ...initialStats }));
    }
  }, [initialStats]);

  // Calculate total stats from both halves
  const totalStats: LiveStats = {
    points: firstHalfStats.points + secondHalfStats.points,
    fgMade: firstHalfStats.fgMade + secondHalfStats.fgMade,
    fgAttempted: firstHalfStats.fgAttempted + secondHalfStats.fgAttempted,
    threePtMade: firstHalfStats.threePtMade + secondHalfStats.threePtMade,
    threePtAttempted: firstHalfStats.threePtAttempted + secondHalfStats.threePtAttempted,
    ftMade: firstHalfStats.ftMade + secondHalfStats.ftMade,
    ftAttempted: firstHalfStats.ftAttempted + secondHalfStats.ftAttempted,
    rebounds: firstHalfStats.rebounds + secondHalfStats.rebounds,
    offensiveRebounds: firstHalfStats.offensiveRebounds + secondHalfStats.offensiveRebounds,
    defensiveRebounds: firstHalfStats.defensiveRebounds + secondHalfStats.defensiveRebounds,
    assists: firstHalfStats.assists + secondHalfStats.assists,
    steals: firstHalfStats.steals + secondHalfStats.steals,
    blocks: firstHalfStats.blocks + secondHalfStats.blocks,
    turnovers: firstHalfStats.turnovers + secondHalfStats.turnovers,
    fouls: firstHalfStats.fouls + secondHalfStats.fouls,
  };

  // Get current half stats for display
  const currentStats = currentHalf === 1 ? firstHalfStats : secondHalfStats;
  const setCurrentStats = currentHalf === 1 ? setFirstHalfStats : setSecondHalfStats;

  // Auto-hide fire celebration after delay
  useEffect(() => {
    if (showFireCelebration) {
      const timer = setTimeout(() => setShowFireCelebration(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [showFireCelebration]);

  const recordStat = useCallback((action: Omit<StatAction, 'half'>) => {
    const fullAction: StatAction = { ...action, half: currentHalf };
    
    // Check if this is a made shot to trigger fire celebration
    const isMadeShot = action.type === 'fgMade' || action.type === 'threePtMade' || action.type === 'ftMade';
    const isMiss = action.type === 'fgAttempted' || action.type === 'threePtAttempted' || action.type === 'ftAttempted';
    
    // Play appropriate sound effect
    if (isMadeShot) {
      playSound('make');
    } else if (action.type === 'ftAttempted') {
      playSound('miss_ft');
    } else if (isMiss) {
      playSound('miss');
    } else if (action.type === 'offensiveRebounds' || action.type === 'defensiveRebounds') {
      playSound('rebound');
    } else if (action.type === 'assists') {
      playSound('assist');
    } else if (action.type === 'steals') {
      playSound('steal');
    } else if (action.type === 'blocks') {
      playSound('block');
    } else if (action.type === 'turnovers') {
      playSound('turnover');
    }
    
    setCurrentStats(prev => {
      const newStats = { ...prev };
      
      // Handle shot makes - also increment attempts and points
      if (action.type === 'fgMade') {
        newStats.fgMade += 1;
        newStats.fgAttempted += 1;
        newStats.points += 2;
      } else if (action.type === 'threePtMade') {
        newStats.threePtMade += 1;
        newStats.threePtAttempted += 1;
        newStats.points += 3;
      } else if (action.type === 'ftMade') {
        newStats.ftMade += 1;
        newStats.ftAttempted += 1;
        newStats.points += 1;
      } else if (action.type === 'fgAttempted') {
        // Miss - only increment attempts
        newStats.fgAttempted += 1;
      } else if (action.type === 'threePtAttempted') {
        newStats.threePtAttempted += 1;
      } else if (action.type === 'ftAttempted') {
        newStats.ftAttempted += 1;
      } else if (action.type === 'offensiveRebounds') {
        newStats.offensiveRebounds += 1;
        newStats.rebounds += 1;
      } else if (action.type === 'defensiveRebounds') {
        newStats.defensiveRebounds += 1;
        newStats.rebounds += 1;
      } else {
        newStats[action.type] += action.value;
      }
      
      return newStats;
    });
    
    setHistory(prev => [...prev, fullAction]);
    setLastAction(action.label);
    
    // Trigger fire celebration for made shots
    if (isMadeShot) {
      setShowFireCelebration(true);
    }
    
    // Clear the last action indicator after a moment
    setTimeout(() => setLastAction(null), 1500);
  }, [currentHalf, setCurrentStats, playSound]);

  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    const targetSetStats = lastAction.half === 1 ? setFirstHalfStats : setSecondHalfStats;
    
    targetSetStats(prev => {
      const newStats = { ...prev };
      
      // Reverse the action
      if (lastAction.type === 'fgMade') {
        newStats.fgMade -= 1;
        newStats.fgAttempted -= 1;
        newStats.points -= 2;
      } else if (lastAction.type === 'threePtMade') {
        newStats.threePtMade -= 1;
        newStats.threePtAttempted -= 1;
        newStats.points -= 3;
      } else if (lastAction.type === 'ftMade') {
        newStats.ftMade -= 1;
        newStats.ftAttempted -= 1;
        newStats.points -= 1;
      } else if (lastAction.type === 'fgAttempted') {
        newStats.fgAttempted -= 1;
      } else if (lastAction.type === 'threePtAttempted') {
        newStats.threePtAttempted -= 1;
      } else if (lastAction.type === 'ftAttempted') {
        newStats.ftAttempted -= 1;
      } else if (lastAction.type === 'offensiveRebounds') {
        newStats.offensiveRebounds -= 1;
        newStats.rebounds -= 1;
      } else if (lastAction.type === 'defensiveRebounds') {
        newStats.defensiveRebounds -= 1;
        newStats.rebounds -= 1;
      } else {
        newStats[lastAction.type] -= lastAction.value;
      }
      
      return newStats;
    });
    
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Please sign in to upload photos');
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

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

      setGamePhoto(publicUrl);
      onPhotoCapture?.(publicUrl);
      toast.success('Game photo captured!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = () => {
    setGamePhoto(null);
    onPhotoCapture?.('');
  };

  const handleSaveClick = () => {
    setShowGameOverDialog(true);
  };

  const handleSave = (isGameOver: boolean) => {
    const saveData: LiveStatsSaveData = {
      total: totalStats,
      firstHalf: firstHalfStats,
      secondHalf: secondHalfStats,
      gamePhotoUrl: gamePhoto || undefined,
      isWin: isWin ?? undefined,
    };
    setShowGameOverDialog(false);
    onSave(totalStats, saveData, isGameOver);
  };

  const fgPct = currentStats.fgAttempted > 0 ? Math.round((currentStats.fgMade / currentStats.fgAttempted) * 100) : 0;
  const threePct = currentStats.threePtAttempted > 0 ? Math.round((currentStats.threePtMade / currentStats.threePtAttempted) * 100) : 0;
  const ftPct = currentStats.ftAttempted > 0 ? Math.round((currentStats.ftMade / currentStats.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fire Celebration Overlay */}
      <FireCelebration show={showFireCelebration} />
      
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Live Capture</p>
          <p className="font-semibold">vs {opponent}</p>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className={cn(gamePhoto && "text-green-400")}
          >
            {isUploadingPhoto ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : gamePhoto ? (
              <ImageIcon className="w-5 h-5" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={undoLast} disabled={history.length === 0}>
            <Undo2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Photo Preview */}
      {gamePhoto && (
        <div className="relative">
          <img 
            src={gamePhoto} 
            alt="Game photo" 
            className="w-full h-32 object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 w-8 h-8"
            onClick={removePhoto}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            📸 Game Day Photo
          </div>
        </div>
      )}

      {/* Last Action Indicator */}
      {lastAction && (
        <div className="bg-primary/20 text-primary text-center py-2 text-sm font-medium animate-pulse">
          + {lastAction} ({currentHalf === 1 ? '1st' : '2nd'} Half)
        </div>
      )}

      {/* Points Display - Shows Total */}
      <div className="bg-gradient-to-r from-primary to-primary/80 py-6 text-center">
        <p className="text-5xl font-bold text-primary-foreground">{totalStats.points}</p>
        <p className="text-primary-foreground/80 uppercase tracking-wider text-sm mt-1">Total Points</p>
        <div className="flex justify-center gap-6 mt-2 text-primary-foreground/70 text-sm">
          <span>1st: {firstHalfStats.points}</span>
          <span>2nd: {secondHalfStats.points}</span>
        </div>
      </div>

      {/* Quick Stats Bar - Shows Total */}
      <div className="grid grid-cols-6 gap-1 p-2 bg-card border-b border-border">
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.rebounds}</p>
          <p className="text-[10px] text-muted-foreground uppercase">REB</p>
          <p className="text-[9px] text-muted-foreground">{totalStats.offensiveRebounds}O / {totalStats.defensiveRebounds}D</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.assists}</p>
          <p className="text-[10px] text-muted-foreground uppercase">AST</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.steals}</p>
          <p className="text-[10px] text-muted-foreground uppercase">STL</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.blocks}</p>
          <p className="text-[10px] text-muted-foreground uppercase">BLK</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.turnovers}</p>
          <p className="text-[10px] text-muted-foreground uppercase">TO</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{totalStats.fouls}</p>
          <p className="text-[10px] text-muted-foreground uppercase">PF</p>
        </div>
      </div>

      {/* Remote Buttons */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Half Selection */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={currentHalf === 1 ? "default" : "outline"}
            onClick={() => setCurrentHalf(1)}
            className={cn(
              "flex-1 max-w-[150px] font-semibold",
              currentHalf === 1 && "gradient-primary"
            )}
          >
            1st Half
          </Button>
          <Button
            variant={currentHalf === 2 ? "default" : "outline"}
            onClick={() => setCurrentHalf(2)}
            className={cn(
              "flex-1 max-w-[150px] font-semibold",
              currentHalf === 2 && "gradient-primary"
            )}
          >
            2nd Half
          </Button>
        </div>

        {/* Game Result Selection */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">Game Result</p>
          <div className="flex gap-2 justify-center">
            <Button
              variant={isWin === true ? "default" : "outline"}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                setIsWin(true);
              }}
              className={cn(
                "flex-1 max-w-[120px] font-semibold",
                isWin === true && "bg-green-500 hover:bg-green-600 text-white"
              )}
            >
              ✓ Win
            </Button>
            <Button
              variant={isWin === false ? "default" : "outline"}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                setIsWin(false);
              }}
              className={cn(
                "flex-1 max-w-[120px] font-semibold",
                isWin === false && "bg-red-500 hover:bg-red-600 text-white"
              )}
            >
              ✗ Loss
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            {currentHalf === 1 ? '1st' : '2nd'} Half Stats
          </p>
          <div className="flex justify-center gap-4 text-sm flex-wrap">
            <span>{currentStats.points} PTS</span>
            <span>{currentStats.rebounds} REB</span>
            <span>{currentStats.assists} AST</span>
            <span>{currentStats.steals} STL</span>
            <span>{currentStats.blocks} BLK</span>
          </div>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
            <span>2PT: {currentStats.fgAttempted - currentStats.threePtAttempted > 0 
              ? Math.round(((currentStats.fgMade - currentStats.threePtMade) / (currentStats.fgAttempted - currentStats.threePtAttempted)) * 100) 
              : 0}%</span>
            <span>3PT: {currentStats.threePtAttempted > 0 
              ? Math.round((currentStats.threePtMade / currentStats.threePtAttempted) * 100) 
              : 0}%</span>
          </div>
        </div>

        {/* Shooting Section */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>
          
          {/* 2PT Field Goals */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">2PT Field Goals</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentStats.fgMade - currentStats.threePtMade}/{currentStats.fgAttempted - currentStats.threePtAttempted} ({fgPct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'fgMade', value: 1, label: '2PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'fgAttempted', value: 1, label: '2PT Miss' })}
              />
            </div>
          </div>

          {/* 3PT Field Goals */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary" />
                <span className="font-medium">3PT Field Goals</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentStats.threePtMade}/{currentStats.threePtAttempted} ({threePct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'threePtMade', value: 1, label: '3PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'threePtAttempted', value: 1, label: '3PT Miss' })}
              />
            </div>
          </div>

          {/* Free Throws */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">Free Throws</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentStats.ftMade}/{currentStats.ftAttempted} ({ftPct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'ftMade', value: 1, label: 'FT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'ftAttempted', value: 1, label: 'FT Miss' })}
              />
            </div>
          </div>
        </div>

        {/* Other Stats Section */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Other Stats</h3>
          
          {/* Rebounds Section */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <span className="font-medium">Rebounds</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentStats.rebounds} ({currentStats.offensiveRebounds}O / {currentStats.defensiveRebounds}D)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Offensive" 
                count={currentStats.offensiveRebounds}
                variant="success"
                onPress={() => recordStat({ type: 'offensiveRebounds', value: 1, label: 'Off. Rebound' })}
              />
              <StatButton 
                label="Defensive" 
                count={currentStats.defensiveRebounds}
                variant="primary"
                onPress={() => recordStat({ type: 'defensiveRebounds', value: 1, label: 'Def. Rebound' })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <StatButton 
              label="Assist" 
              icon={Zap}
              count={currentStats.assists}
              variant="primary"
              onPress={() => recordStat({ type: 'assists', value: 1, label: 'Assist' })}
            />
            <StatButton 
              label="Steal" 
              icon={Shield}
              count={currentStats.steals}
              variant="primary"
              onPress={() => recordStat({ type: 'steals', value: 1, label: 'Steal' })}
            />
            <StatButton 
              label="Block" 
              icon={HandMetal}
              count={currentStats.blocks}
              variant="primary"
              onPress={() => recordStat({ type: 'blocks', value: 1, label: 'Block' })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatButton 
              label="Turnover" 
              icon={AlertCircle}
              count={currentStats.turnovers}
              variant="warning"
              onPress={() => recordStat({ type: 'turnovers', value: 1, label: 'Turnover' })}
            />
            <StatButton 
              label="Foul" 
              icon={UserX}
              count={currentStats.fouls}
              variant="danger"
              onPress={() => recordStat({ type: 'fouls', value: 1, label: 'Personal Foul' })}
            />
          </div>
        </div>
      </div>

      {/* Save Footer */}
      <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSaveClick} disabled={isSaving} className="flex-1 gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Stats'}
        </Button>
      </div>

      {/* Game Over Confirmation Dialog */}
      <AlertDialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Is the game over?</AlertDialogTitle>
            <AlertDialogDescription>
              If the game is over, we'll save your final stats and take you to the game recap. 
              If not, your stats will be saved so you can resume later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isWin === null && (
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
              <p className="text-sm text-orange-400 font-medium">
                Please select Win or Loss above before marking the game as over
              </p>
            </div>
          )}
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowGameOverDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              No, Save & Continue Later
            </Button>
            <AlertDialogAction 
              onClick={() => handleSave(true)}
              disabled={isSaving || isWin === null}
              className="gradient-primary"
            >
              Yes, Game Over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StatButtonProps {
  label: string;
  icon?: React.ElementType;
  count?: number;
  variant: 'success' | 'danger' | 'primary' | 'warning';
  onPress: () => void;
  fullWidth?: boolean;
}

function StatButton({ label, icon: Icon, count, variant, onPress, fullWidth }: StatButtonProps) {
  const variantClasses = {
    success: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 active:bg-green-500/40',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 active:bg-red-500/40',
    primary: 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 active:bg-primary/40',
    warning: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-orange-500/30 active:bg-orange-500/40',
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        'py-4 px-4 rounded-xl border font-semibold transition-all duration-100',
        'flex items-center justify-center gap-2',
        'touch-manipulation select-none',
        variantClasses[variant],
        fullWidth && 'col-span-2'
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className="bg-background/50 px-2 py-0.5 rounded-full text-sm">{count}</span>
      )}
    </button>
  );
}
