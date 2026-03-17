import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LongPressButton } from '@/components/ui/long-press-button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  UserX,
  Radio,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FireCelebration } from './FireCelebration';
import { StatFlash, getFlashConfig } from './StatFlash';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLiveStatsAutosave } from '@/hooks/useLiveStatsAutosave';
import { useShakeDetector } from '@/hooks/useShakeDetector';
import { HalfStats } from '@/types/basketball';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
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

export interface TeamScore {
  us: number;
  them: number;
}

export interface LiveStatsSaveData {
  total: LiveStats;
  firstHalf: HalfStats;
  secondHalf: HalfStats;
  gamePhotoUrl?: string;
  isWin?: boolean;
  halftimeScore?: TeamScore;
  finalScore?: TeamScore;
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
  const [statFlash, setStatFlash] = useState<{
    show: boolean;
    emoji: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'neutral';
  } | null>(null);
  const [gamePhoto, setGamePhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    try { return localStorage.getItem('hj-sound-effects') === 'true'; } catch { return false; }
  });
  const [hasRestoredFromAutosave, setHasRestoredFromAutosave] = useState(false);
  const [showHalftimeDialog, setShowHalftimeDialog] = useState(false);
  const [halftimeScore, setHalftimeScore] = useState<TeamScore | null>(null);
  const [halftimeScoreInput, setHalftimeScoreInput] = useState({ us: '', them: '' });
  const [finalScore, setFinalScore] = useState<TeamScore | null>(null);
  const [finalScoreInput, setFinalScoreInput] = useState({ us: '', them: '' });
  const [pendingWinSelection, setPendingWinSelection] = useState<boolean | null>(null);
  const [showFinalScoreDialog, setShowFinalScoreDialog] = useState(false);
  const [editingStat, setEditingStat] = useState<{ key: keyof LiveStats; label: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAutosaveEnabledRef = useRef(true);
  const { playSound } = useSoundEffects();
  const { triggerHaptic } = useHapticFeedback();
  const { getSavedData, saveData, immediateSave, clearSavedData } = useLiveStatsAutosave(opponent);

  // Initialize with any passed initial stats (goes to first half)
  // Using a ref to track if we've initialized to prevent re-running on every render
  const hasInitialized = useRef(false);
  
  // Restore from autosave on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    
    const savedData = getSavedData();
    if (savedData) {
      // Restore all state from autosave
      setCurrentHalf(savedData.currentHalf);
      setFirstHalfStats(savedData.firstHalfStats);
      setSecondHalfStats(savedData.secondHalfStats);
      setHistory(savedData.history);
      setGamePhoto(savedData.gamePhoto);
      setIsWin(savedData.isWin);
      
      if (savedData.halftimeScore) {
        setHalftimeScore(savedData.halftimeScore);
      }
      if (savedData.finalScore) {
        setFinalScore(savedData.finalScore);
      }
      setHasRestoredFromAutosave(true);
      
      toast.success('Restored your stats from autosave!', {
        description: 'Your previous session was recovered.',
        duration: 3000,
      });
      
      hasInitialized.current = true;
    } else if (initialStats) {
      hasInitialized.current = true;
      setFirstHalfStats(prev => ({ ...prev, ...initialStats }));
    }
  }, [getSavedData, initialStats]);

  // Autosave on state changes (debounced)
  useEffect(() => {
    if (!hasInitialized.current || !isAutosaveEnabledRef.current) return;
    
    saveData({
      opponent,
      currentHalf,
      firstHalfStats,
      secondHalfStats,
      history,
      gamePhoto,
      isWin,
      soundEffectsEnabled,
      halftimeScore,
      finalScore,
    });
  }, [opponent, currentHalf, firstHalfStats, secondHalfStats, history, gamePhoto, isWin, soundEffectsEnabled, halftimeScore, finalScore, saveData]);

  // Keep a ref of current state for unmount save
  const stateRef = useRef({
    opponent, currentHalf, firstHalfStats, secondHalfStats, history,
    gamePhoto, isWin, soundEffectsEnabled, halftimeScore, finalScore,
  });
  useEffect(() => {
    stateRef.current = {
      opponent, currentHalf, firstHalfStats, secondHalfStats, history,
      gamePhoto, isWin, soundEffectsEnabled, halftimeScore, finalScore,
    };
  }, [opponent, currentHalf, firstHalfStats, secondHalfStats, history, gamePhoto, isWin, soundEffectsEnabled, halftimeScore, finalScore]);

  // Save on unmount (navigation away) so data persists
  useEffect(() => {
    return () => {
      if (isAutosaveEnabledRef.current) {
        immediateSave(stateRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Immediate save when page becomes hidden (user switches tabs, receives call, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isAutosaveEnabledRef.current) {
        immediateSave(stateRef.current);
      }
    };

    const handlePageHide = () => {
      if (isAutosaveEnabledRef.current) {
        immediateSave(stateRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [immediateSave]);

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
    
    // Trigger haptic feedback on mobile devices (iOS + Android)
    if (isMadeShot) {
      triggerHaptic('success'); // Double haptic for made shots
    } else if (isMiss || action.type === 'turnovers' || action.type === 'fouls') {
      triggerHaptic('light'); // Light haptic for negative stats
    } else {
      triggerHaptic('medium'); // Medium haptic for positive stats
    }
    
    // Play appropriate sound effect only if enabled
    if (soundEffectsEnabled) {
      if (isMadeShot) {
        playSound('make');
      } else if (action.type === 'ftAttempted') {
        playSound('miss_ft');
      } else if (action.type === 'threePtAttempted') {
        playSound('miss_3pt');
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
      } else if (action.type === 'fouls') {
        playSound('foul');
      }
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
      
      // Check for foul trouble (4+ fouls) - combine with other half stats
      if (action.type === 'fouls') {
        const otherHalfFouls = currentHalf === 1 ? secondHalfStats.fouls : firstHalfStats.fouls;
        const newTotalFouls = newStats.fouls + otherHalfFouls;
        
        if (newTotalFouls >= 4) {
          // Triple haptic pattern for foul trouble warning
          triggerHaptic('error');
          setTimeout(() => triggerHaptic('error'), 150);
          
          const foulMessage = newTotalFouls === 5 
            ? '⚠️ FOULED OUT! 5 fouls' 
            : `⚠️ Foul trouble! ${newTotalFouls} fouls`;
          
          toast.warning(foulMessage, {
            duration: 3000,
            icon: '🏀',
          });
        }
      }
      
      return newStats;
    });
    
    setHistory(prev => [...prev, fullAction]);
    setLastAction(action.label);
    
    // Trigger fire celebration for made shots
    if (isMadeShot) {
      setShowFireCelebration(true);
    } else {
      // Trigger stat flash for other actions
      const flashConfig = getFlashConfig(action.type);
      if (flashConfig) {
        setStatFlash({ show: true, ...flashConfig });
        // Reset after animation completes
        setTimeout(() => setStatFlash(null), 850);
      }
    }
    
    // Clear the last action indicator after a moment
    setTimeout(() => setLastAction(null), 1500);
  }, [currentHalf, setCurrentStats, playSound, soundEffectsEnabled, triggerHaptic, firstHalfStats.fouls, secondHalfStats.fouls]);

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

  // Undo last shot for a specific shot type (2PT, 3PT, FT)
  const undoLastShot = useCallback((shotType: '2pt' | '3pt' | 'ft') => {
    // Find the last action matching this shot type in current half
    const shotMadeKey = shotType === '2pt' ? 'fgMade' : shotType === '3pt' ? 'threePtMade' : 'ftMade';
    const shotMissKey = shotType === '2pt' ? 'fgAttempted' : shotType === '3pt' ? 'threePtAttempted' : 'ftAttempted';
    
    // Find the last matching shot action in history (for current half)
    const lastShotIndex = [...history].reverse().findIndex(
      action => action.half === currentHalf && (action.type === shotMadeKey || action.type === shotMissKey)
    );
    
    if (lastShotIndex === -1) {
      toast.info(`No ${shotType.toUpperCase()} shots to undo`, { duration: 1500 });
      return;
    }
    
    const actualIndex = history.length - 1 - lastShotIndex;
    const shotAction = history[actualIndex];
    
    // Undo the specific shot
    setCurrentStats(prev => {
      const newStats = { ...prev };
      
      if (shotAction.type === 'fgMade') {
        newStats.fgMade = Math.max(0, newStats.fgMade - 1);
        newStats.fgAttempted = Math.max(0, newStats.fgAttempted - 1);
        newStats.points = Math.max(0, newStats.points - 2);
      } else if (shotAction.type === 'threePtMade') {
        newStats.threePtMade = Math.max(0, newStats.threePtMade - 1);
        newStats.threePtAttempted = Math.max(0, newStats.threePtAttempted - 1);
        newStats.points = Math.max(0, newStats.points - 3);
      } else if (shotAction.type === 'ftMade') {
        newStats.ftMade = Math.max(0, newStats.ftMade - 1);
        newStats.ftAttempted = Math.max(0, newStats.ftAttempted - 1);
        newStats.points = Math.max(0, newStats.points - 1);
      } else if (shotAction.type === 'fgAttempted') {
        newStats.fgAttempted = Math.max(0, newStats.fgAttempted - 1);
      } else if (shotAction.type === 'threePtAttempted') {
        newStats.threePtAttempted = Math.max(0, newStats.threePtAttempted - 1);
      } else if (shotAction.type === 'ftAttempted') {
        newStats.ftAttempted = Math.max(0, newStats.ftAttempted - 1);
      }
      
      return newStats;
    });
    
    // Remove this action from history
    setHistory(prev => [...prev.slice(0, actualIndex), ...prev.slice(actualIndex + 1)]);
    
    triggerHaptic('light');
    const wasAMake = shotAction.type === shotMadeKey;
    toast.info(`Undid ${shotType.toUpperCase()} ${wasAMake ? 'make' : 'miss'}`, { duration: 1500, icon: '↩️' });
  }, [history, currentHalf, setCurrentStats, triggerHaptic]);

  // Shake-to-undo gesture handler
  const handleShakeUndo = useCallback(() => {
    if (history.length === 0) return;
    
    // Trigger haptic feedback for shake detection
    triggerHaptic('medium');
    
    // Undo the last action
    undoLast();
    
    // Show toast notification
    toast.info('Shake detected — last action undone', {
      duration: 1500,
      icon: '↩️',
    });
  }, [history.length, triggerHaptic, undoLast]);

  // Initialize shake detector
  useShakeDetector({
    threshold: 20, // Sensitivity - higher = less sensitive
    timeout: 1500, // Cooldown between shakes
    onShake: handleShakeUndo,
  });

  // Handle direct stat editing via long-press
  const handleStartEditStat = useCallback((key: keyof LiveStats, label: string) => {
    triggerHaptic('medium');
    setEditingStat({ key, label });
    setEditingValue(String(currentStats[key]));
  }, [currentStats, triggerHaptic]);

  const handleSaveEditStat = useCallback(() => {
    if (!editingStat) return;
    
    const newValue = parseInt(editingValue) || 0;
    const oldValue = currentStats[editingStat.key];
    
    // For compound stats, we need special handling
    if (editingStat.key === 'points') {
      // Points are derived from shots, so we adjust the difference
      const diff = newValue - oldValue;
      setCurrentStats(prev => ({ ...prev, points: Math.max(0, prev.points + diff) }));
    } else if (editingStat.key === 'rebounds') {
      // Adjust total rebounds
      const diff = newValue - oldValue;
      setCurrentStats(prev => ({ 
        ...prev, 
        rebounds: Math.max(0, newValue),
        // Proportionally adjust defensive rebounds
        defensiveRebounds: Math.max(0, prev.defensiveRebounds + diff)
      }));
    } else {
      setCurrentStats(prev => ({ ...prev, [editingStat.key]: Math.max(0, newValue) }));
    }
    
    toast.success(`${editingStat.label} updated to ${newValue}`, { duration: 1500 });
    setEditingStat(null);
    setEditingValue('');
  }, [editingStat, editingValue, currentStats, setCurrentStats]);

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
    // Pre-fill with existing scores or player's points
    if (!finalScore) {
      setFinalScoreInput({ 
        us: halftimeScore ? halftimeScore.us.toString() : totalStats.points.toString(), 
        them: halftimeScore ? halftimeScore.them.toString() : '' 
      });
    } else {
      setFinalScoreInput({ us: finalScore.us.toString(), them: finalScore.them.toString() });
    }
    setShowGameOverDialog(true);
  };

  // Handle game over confirmation with final score
  const handleGameOverConfirm = () => {
    const us = parseInt(finalScoreInput.us) || 0;
    const them = parseInt(finalScoreInput.them) || 0;
    const determinedWin = us > them;
    
    setFinalScore({ us, them });
    setIsWin(determinedWin);
    
    // Save with the determined values
    const savePayload: LiveStatsSaveData = {
      total: totalStats,
      firstHalf: firstHalfStats,
      secondHalf: secondHalfStats,
      gamePhotoUrl: gamePhoto || undefined,
      isWin: determinedWin,
      halftimeScore: halftimeScore ?? undefined,
      finalScore: { us, them },
    };
    setShowGameOverDialog(false);
    isAutosaveEnabledRef.current = false;
    clearSavedData();
    onSave(totalStats, savePayload, true);
  };

  const handleSave = (isGameOver: boolean) => {
    const savePayload: LiveStatsSaveData = {
      total: totalStats,
      firstHalf: firstHalfStats,
      secondHalf: secondHalfStats,
      gamePhotoUrl: gamePhoto || undefined,
      isWin: isWin ?? undefined,
      halftimeScore: halftimeScore ?? undefined,
      finalScore: finalScore ?? undefined,
    };
    setShowGameOverDialog(false);
    
    // Clear autosave data when successfully saving
    clearSavedData();
    
    onSave(totalStats, savePayload, isGameOver);
  };

  // Handle switching to 2nd half - require halftime score
  const handleSwitchToSecondHalf = () => {
    if (!halftimeScore) {
      setShowHalftimeDialog(true);
    } else {
      setCurrentHalf(2);
    }
  };

  // Confirm halftime score and switch to 2nd half
  const handleHalftimeScoreConfirm = () => {
    const us = parseInt(halftimeScoreInput.us) || 0;
    const them = parseInt(halftimeScoreInput.them) || 0;
    setHalftimeScore({ us, them });
    setShowHalftimeDialog(false);
    setCurrentHalf(2);
  };

  // Handle win/loss selection - require final score first
  const handleWinLossClick = (isWinSelection: boolean) => {
    triggerHaptic('success'); // Double-pulse haptic for satisfying feedback
    setPendingWinSelection(isWinSelection);
    if (!finalScore) {
      // Pre-fill with player's total points as "us"
      setFinalScoreInput(prev => ({ ...prev, us: totalStats.points.toString() }));
      setShowFinalScoreDialog(true);
    } else {
      setIsWin(isWinSelection);
    }
  };

  // Confirm final score and set win/loss
  const handleFinalScoreConfirm = () => {
    const us = parseInt(finalScoreInput.us) || 0;
    const them = parseInt(finalScoreInput.them) || 0;
    setFinalScore({ us, them });
    setShowFinalScoreDialog(false);
    if (pendingWinSelection !== null) {
      setIsWin(pendingWinSelection);
    }
    setPendingWinSelection(null);
  };

  const fgPct = currentStats.fgAttempted > 0 ? Math.round((currentStats.fgMade / currentStats.fgAttempted) * 100) : 0;
  const threePct = currentStats.threePtAttempted > 0 ? Math.round((currentStats.threePtMade / currentStats.threePtAttempted) * 100) : 0;
  const ftPct = currentStats.ftAttempted > 0 ? Math.round((currentStats.ftMade / currentStats.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Visual Feedback Overlays */}
      <FireCelebration show={showFireCelebration} />
      {statFlash && (
        <StatFlash
          show={statFlash.show}
          emoji={statFlash.emoji}
          message={statFlash.message}
          variant={statFlash.variant}
        />
      )}
      
      {/* Header - Compact */}
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCancelConfirm(true)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex items-center gap-2">
          {/* LIVE Indicator */}
          <Badge variant="destructive" className="animate-pulse gap-1 px-2 py-0.5 text-[10px]">
            <Radio className="w-3 h-3" />
            LIVE
          </Badge>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">vs</p>
            <p className="font-semibold text-sm leading-tight">{opponent}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
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
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : gamePhoto ? (
              <ImageIcon className="w-4 h-4 text-green-400" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undoLast} disabled={history.length === 0}>
            <Undo2 className="w-4 h-4" />
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

      {/* Points Display - Compact */}
      <div className="bg-gradient-to-r from-primary to-primary/80 py-3 text-center">
        <p className="text-4xl font-bold text-primary-foreground">{totalStats.points}</p>
        <div className="flex justify-center gap-4 mt-1 text-primary-foreground/70 text-xs">
          <span>1st: {firstHalfStats.points}</span>
          <span>2nd: {secondHalfStats.points}</span>
        </div>
      </div>

      {/* Quick Stats Bar - Compact */}
      <div className="grid grid-cols-6 gap-0.5 px-2 py-1 bg-card border-b border-border">
        <div className="text-center py-1">
          <p className="text-base font-bold">{totalStats.rebounds}</p>
          <p className="text-[9px] text-muted-foreground uppercase">REB</p>
        </div>
        <div className="text-center py-1">
          <p className="text-base font-bold">{totalStats.assists}</p>
          <p className="text-[9px] text-muted-foreground uppercase">AST</p>
        </div>
        <div className="text-center py-1">
          <p className="text-base font-bold">{totalStats.steals}</p>
          <p className="text-[9px] text-muted-foreground uppercase">STL</p>
        </div>
        <div className="text-center py-1">
          <p className="text-base font-bold">{totalStats.blocks}</p>
          <p className="text-[9px] text-muted-foreground uppercase">BLK</p>
        </div>
        <div className="text-center py-1">
          <p className="text-base font-bold">{totalStats.turnovers}</p>
          <p className="text-[9px] text-muted-foreground uppercase">TO</p>
        </div>
        <div className={cn(
          "text-center py-1 rounded-md transition-all duration-300",
          totalStats.fouls >= 4 && "bg-red-500/20 ring-1 ring-red-500/50",
          totalStats.fouls >= 5 && "bg-red-500/30 ring-2 ring-red-500 animate-pulse"
        )}>
          <p className={cn(
            "text-base font-bold transition-colors",
            totalStats.fouls >= 4 && "text-red-400",
            totalStats.fouls >= 5 && "text-red-300"
          )}>
            {totalStats.fouls}
            {totalStats.fouls >= 4 && (
              <span className="ml-0.5 text-[10px]">⚠️</span>
            )}
          </p>
          <p className={cn(
            "text-[9px] uppercase transition-colors",
            totalStats.fouls >= 4 ? "text-red-400/80" : "text-muted-foreground"
          )}>
            {totalStats.fouls >= 5 ? "OUT" : "PF"}
          </p>
        </div>
      </div>

      {/* Remote Buttons - Compact */}
      <div className="flex-1 px-3 py-2 space-y-2 overflow-auto">
        {/* Half Selection - Compact */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={currentHalf === 1 ? "default" : "outline"}
            onClick={() => setCurrentHalf(1)}
            size="sm"
            className={cn(
              "flex-1 max-w-[120px] font-semibold h-8",
              currentHalf === 1 && "gradient-primary"
            )}
          >
            1st Half
          </Button>
          <Button
            variant={currentHalf === 2 ? "default" : "outline"}
            onClick={() => handleSwitchToSecondHalf()}
            size="sm"
            className={cn(
              "flex-1 max-w-[120px] font-semibold h-8",
              currentHalf === 2 && "gradient-primary"
            )}
          >
            2nd Half
            {halftimeScore && <span className="ml-1 text-xs opacity-70">✓</span>}
          </Button>
        </div>

        {/* Current Half Stats Display - Prominent & Editable */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
          <div className="text-center mb-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {currentHalf === 1 ? '1st Half' : '2nd Half'} Stats
            </span>
            <p className="text-[9px] text-muted-foreground mt-0.5">Hold to edit</p>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-1.5 rounded-md bg-muted/30">
              <p className="text-xl font-bold">{currentStats.points}</p>
              <p className="text-[9px] text-muted-foreground uppercase">PTS</p>
            </div>
            <EditableStatCell 
              value={currentStats.rebounds} 
              label="REB" 
              statKey="rebounds"
              onLongPress={handleStartEditStat}
            />
            <EditableStatCell 
              value={currentStats.assists} 
              label="AST" 
              statKey="assists"
              onLongPress={handleStartEditStat}
            />
            <EditableStatCell 
              value={currentStats.steals} 
              label="STL" 
              statKey="steals"
              onLongPress={handleStartEditStat}
            />
            <EditableStatCell 
              value={currentStats.blocks} 
              label="BLK" 
              statKey="blocks"
              onLongPress={handleStartEditStat}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center mt-2 pt-2 border-t border-primary/10">
            <div className="p-1.5 rounded-md bg-muted/30">
              <p className="text-sm font-bold">{currentStats.fgMade}/{currentStats.fgAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">2PT</p>
            </div>
            <div className="p-1.5 rounded-md bg-muted/30">
              <p className="text-sm font-bold">{currentStats.threePtMade}/{currentStats.threePtAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">3PT</p>
            </div>
            <div className="p-1.5 rounded-md bg-muted/30">
              <p className="text-sm font-bold">{currentStats.ftMade}/{currentStats.ftAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">FT</p>
            </div>
            <EditableStatCell 
              value={currentStats.turnovers} 
              label="TO" 
              statKey="turnovers"
              onLongPress={handleStartEditStat}
              small
            />
          </div>
        </div>

        {/* Halftime Score Display - Compact */}
        {halftimeScore && (
          <div className="bg-muted/30 rounded-md px-2 py-1 text-center text-xs flex items-center justify-center gap-1">
            <span className="text-muted-foreground">HT:</span>
            <span className="font-semibold">{halftimeScore.us}-{halftimeScore.them}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 text-[10px] px-1"
              onClick={() => setShowHalftimeDialog(true)}
            >
              Edit
            </Button>
          </div>
        )}


        {/* Game Result Selection - Compact */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">Result:</span>
          <Button
            variant={isWin === true ? "default" : "outline"}
            onClick={() => handleWinLossClick(true)}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs font-semibold transition-all",
              isWin === true 
                ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-bounce-select" 
                : isWin === null
                  ? "animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(34,197,94,0.3)] border-green-500/50 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                  : "border-green-500/30 hover:border-green-500/50"
            )}
          >
            <Check className="w-3 h-3 mr-1" />
            Win
          </Button>
          <Button
            variant={isWin === false ? "default" : "outline"}
            onClick={() => handleWinLossClick(false)}
            size="sm"
            className={cn(
              "h-7 px-3 text-xs font-semibold transition-all",
              isWin === false 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-bounce-select" 
                : isWin === null
                  ? "animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.3)] border-red-500/50 hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "border-red-500/30 hover:border-red-500/50"
            )}
          >
            <X className="w-3 h-3 mr-1" />
            Loss
          </Button>
          {/* Final Score Display - Inline */}
          {finalScore && (
            <span className="text-xs text-muted-foreground ml-auto">
              {finalScore.us}-{finalScore.them}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 text-[10px] px-1 ml-1"
                onClick={() => setShowFinalScoreDialog(true)}
              >
                ✏️
              </Button>
            </span>
          )}
        </div>

        {/* Shooting Section - Compact */}
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>
          
          {/* 2PT Field Goals - Compact */}
          <div className="bg-card rounded-lg p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-sm">2PT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentStats.fgMade}/{currentStats.fgAttempted} ({fgPct}%)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => undoLastShot('2pt')}
                  disabled={!history.some(a => a.half === currentHalf && (a.type === 'fgMade' || a.type === 'fgAttempted'))}
                >
                  <Undo2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatButton 
                label="Made" 
                variant="success"
                emphasis="primary"
                onPress={() => recordStat({ type: 'fgMade', value: 1, label: '2PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                emphasis="secondary"
                onPress={() => recordStat({ type: 'fgAttempted', value: 1, label: '2PT Miss' })}
              />
            </div>
          </div>

          {/* 3PT Field Goals - Compact */}
          <div className="bg-card rounded-lg p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-sm">3PT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentStats.threePtMade}/{currentStats.threePtAttempted} ({threePct}%)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => undoLastShot('3pt')}
                  disabled={!history.some(a => a.half === currentHalf && (a.type === 'threePtMade' || a.type === 'threePtAttempted'))}
                >
                  <Undo2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatButton 
                label="Made" 
                variant="success"
                emphasis="primary"
                onPress={() => recordStat({ type: 'threePtMade', value: 1, label: '3PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                emphasis="secondary"
                onPress={() => recordStat({ type: 'threePtAttempted', value: 1, label: '3PT Miss' })}
              />
            </div>
          </div>

          {/* Free Throws - Compact */}
          <div className="bg-card rounded-lg p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-sm">FT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentStats.ftMade}/{currentStats.ftAttempted} ({ftPct}%)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => undoLastShot('ft')}
                  disabled={!history.some(a => a.half === currentHalf && (a.type === 'ftMade' || a.type === 'ftAttempted'))}
                >
                  <Undo2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatButton 
                label="Made" 
                variant="success"
                emphasis="primary"
                onPress={() => recordStat({ type: 'ftMade', value: 1, label: 'FT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                emphasis="secondary"
                onPress={() => recordStat({ type: 'ftAttempted', value: 1, label: 'FT Miss' })}
              />
            </div>
          </div>
        </div>

        {/* Other Stats Section - Compact */}
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Other Stats</h3>
          
          {/* Rebounds Section - Defensive first (more common) */}
          <div className="bg-card rounded-lg p-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-sm">Rebounds</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentStats.rebounds} ({currentStats.defensiveRebounds}D / {currentStats.offensiveRebounds}O)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Defensive first - more common */}
              <StatButton 
                label="DREB" 
                count={currentStats.defensiveRebounds}
                variant="primary"
                emphasis="primary"
                onPress={() => recordStat({ type: 'defensiveRebounds', value: 1, label: 'Def. Rebound' })}
              />
              <StatButton 
                label="OREB" 
                count={currentStats.offensiveRebounds}
                variant="success"
                emphasis="secondary"
                onPress={() => recordStat({ type: 'offensiveRebounds', value: 1, label: 'Off. Rebound' })}
              />
            </div>
          </div>
          
          {/* Assist emphasized - centered primary action */}
          <div className="flex justify-center">
            <div className="w-full max-w-xs">
              <StatButton 
                label="Assist" 
                icon={Zap}
                count={currentStats.assists}
                variant="primary"
                emphasis="primary"
                fullWidth
                onPress={() => recordStat({ type: 'assists', value: 1, label: 'Assist' })}
              />
            </div>
          </div>

          {/* Steal/Block grouped - less common */}
          <div className="grid grid-cols-2 gap-2">
            <StatButton 
              label="Steal" 
              icon={Shield}
              count={currentStats.steals}
              variant="primary"
              emphasis="secondary"
              onPress={() => recordStat({ type: 'steals', value: 1, label: 'Steal' })}
            />
            <StatButton 
              label="Block" 
              icon={HandMetal}
              count={currentStats.blocks}
              variant="primary"
              emphasis="secondary"
              onPress={() => recordStat({ type: 'blocks', value: 1, label: 'Block' })}
            />
          </div>

          {/* Negative stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatButton 
              label="TO" 
              icon={AlertCircle}
              count={currentStats.turnovers}
              variant="warning"
              emphasis="secondary"
              onPress={() => recordStat({ type: 'turnovers', value: 1, label: 'Turnover' })}
            />
            <StatButton 
              label={totalStats.fouls >= 5 ? "Fouled Out!" : totalStats.fouls >= 4 ? `Foul (${totalStats.fouls})` : "Foul"} 
              icon={UserX}
              count={currentStats.fouls}
              variant="danger"
              emphasis={totalStats.fouls >= 4 ? "primary" : "secondary"}
              onPress={() => recordStat({ type: 'fouls', value: 1, label: 'Personal Foul' })}
              className={cn(
                totalStats.fouls >= 4 && "ring-2 ring-red-500/50 shadow-red-500/20 shadow-lg",
                totalStats.fouls >= 5 && "ring-red-500 animate-pulse"
              )}
            />
          </div>
        </div>
      </div>

      {/* Save Footer - Long-press cancel protection */}
      <div className="sticky bottom-0 bg-card border-t border-border p-3 flex gap-2">
        <LongPressButton 
          variant="outline" 
          onLongPress={onCancel} 
          pressDuration={1200}
          className="flex-1 h-10"
        >
          <X className="w-4 h-4 mr-1" />
          Hold to Cancel
        </LongPressButton>
        <Button onClick={handleSaveClick} disabled={isSaving} className="flex-1 h-10 gradient-primary">
          <Save className="w-4 h-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Live Stats?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current stats will not be saved. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Tracking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelConfirm(false);
                onCancel();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Game Over Confirmation Dialog */}
      <AlertDialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Is the game over?</AlertDialogTitle>
            <AlertDialogDescription>
              If the game is over, enter the final score below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Final Score Input - Always show in game over dialog */}
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gameover-us" className="text-center block text-sm font-medium">Your Team</Label>
                <Input
                  id="gameover-us"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={finalScoreInput.us}
                  onChange={(e) => setFinalScoreInput(prev => ({ ...prev, us: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameover-them" className="text-center block text-sm font-medium">Opponent</Label>
                <Input
                  id="gameover-them"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={finalScoreInput.them}
                  onChange={(e) => setFinalScoreInput(prev => ({ ...prev, them: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your total points: {totalStats.points}
            </p>
            
            {/* Win/Loss indicator based on score */}
            {finalScoreInput.us && finalScoreInput.them && (
              <div className={cn(
                "rounded-lg p-2 text-center text-sm font-medium",
                parseInt(finalScoreInput.us) > parseInt(finalScoreInput.them) 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : parseInt(finalScoreInput.us) < parseInt(finalScoreInput.them)
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              )}>
                {parseInt(finalScoreInput.us) > parseInt(finalScoreInput.them) 
                  ? "🏆 Win!" 
                  : parseInt(finalScoreInput.us) < parseInt(finalScoreInput.them)
                  ? "📉 Loss"
                  : "🤝 Tie"}
              </div>
            )}
          </div>

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
              onClick={() => handleGameOverConfirm()}
              disabled={isSaving || !finalScoreInput.us || !finalScoreInput.them}
              className="gradient-primary"
            >
              Yes, Game Over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Halftime Score Dialog */}
      <AlertDialog open={showHalftimeDialog} onOpenChange={setShowHalftimeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Halftime Score</AlertDialogTitle>
            <AlertDialogDescription>
              What's the score at halftime? This helps track team performance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="halftime-us" className="text-center block">Your Team</Label>
                <Input
                  id="halftime-us"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={halftimeScoreInput.us}
                  onChange={(e) => setHalftimeScoreInput(prev => ({ ...prev, us: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="halftime-them" className="text-center block">Opponent</Label>
                <Input
                  id="halftime-them"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={halftimeScoreInput.them}
                  onChange={(e) => setHalftimeScoreInput(prev => ({ ...prev, them: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your 1st half points: {firstHalfStats.points}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowHalftimeDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleHalftimeScoreConfirm}
              className="gradient-primary"
            >
              Continue to 2nd Half
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Score Dialog */}
      <AlertDialog open={showFinalScoreDialog} onOpenChange={setShowFinalScoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Final Score</AlertDialogTitle>
            <AlertDialogDescription>
              What was the final score of the game?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="final-us" className="text-center block">Your Team</Label>
                <Input
                  id="final-us"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={finalScoreInput.us}
                  onChange={(e) => setFinalScoreInput(prev => ({ ...prev, us: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="final-them" className="text-center block">Opponent</Label>
                <Input
                  id="final-them"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={finalScoreInput.them}
                  onChange={(e) => setFinalScoreInput(prev => ({ ...prev, them: e.target.value }))}
                  className="text-center text-2xl font-bold h-14"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your total points: {totalStats.points}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowFinalScoreDialog(false);
              setPendingWinSelection(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalScoreConfirm}
              className="gradient-primary"
            >
              Confirm Score
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Stat Dialog */}
      <AlertDialog open={!!editingStat} onOpenChange={(open) => !open && setEditingStat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit {editingStat?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the correct value for this stat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="number"
              min="0"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="text-center text-2xl font-bold h-14"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditingStat(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveEditStat}
              className="gradient-primary"
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Editable stat cell with long-press to edit
interface EditableStatCellProps {
  value: number | string;
  label: string;
  statKey: keyof LiveStats;
  onLongPress: (key: keyof LiveStats, label: string) => void;
  small?: boolean;
}

function EditableStatCell({ value, label, statKey, onLongPress, small }: EditableStatCellProps) {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressDuration = 600; // ms

  const handlePressStart = useCallback(() => {
    setIsPressing(true);
    setProgress(0);
    
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / pressDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100) {
        pressTimer.current = setTimeout(updateProgress, 16);
      } else {
        onLongPress(statKey, label);
        setIsPressing(false);
        setProgress(0);
      }
    };
    
    pressTimer.current = setTimeout(updateProgress, 16);
  }, [onLongPress, statKey, label, pressDuration]);

  const handlePressEnd = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "relative cursor-pointer select-none touch-manipulation rounded-md transition-all",
        isPressing && "bg-primary/20 scale-95"
      )}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      {/* Progress indicator */}
      {isPressing && (
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full transition-none"
          style={{ width: `${progress}%` }}
        />
      )}
      <p className={cn(
        "font-bold text-foreground",
        small ? "text-sm" : "text-xl"
      )}>
        {value}
      </p>
      <p className={cn(
        "uppercase",
        small ? "text-[9px] text-muted-foreground/70" : "text-[10px] text-muted-foreground"
      )}>
        {label}
      </p>
    </div>
  );
}

interface StatButtonProps {
  label: string;
  icon?: React.ElementType;
  count?: number;
  variant: 'success' | 'danger' | 'primary' | 'warning';
  emphasis?: 'primary' | 'secondary';
  onPress: () => void;
  fullWidth?: boolean;
  className?: string;
}

function StatButton({ label, icon: Icon, count, variant, emphasis = 'primary', onPress, fullWidth, className }: StatButtonProps) {
  // Primary emphasis = brighter, stronger; Secondary = muted
  const isPrimary = emphasis === 'primary';
  
  const variantClasses = {
    success: isPrimary 
      ? 'bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-400/50 active:bg-green-500/50 shadow-sm shadow-green-500/20'
      : 'bg-green-500/15 hover:bg-green-500/25 text-green-400/80 border-green-500/20 active:bg-green-500/30',
    danger: isPrimary 
      ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-400/50 active:bg-red-500/50 shadow-sm shadow-red-500/20'
      : 'bg-red-500/15 hover:bg-red-500/25 text-red-400/70 border-red-500/20 active:bg-red-500/30',
    primary: isPrimary 
      ? 'bg-primary/30 hover:bg-primary/40 text-primary border-primary/50 active:bg-primary/50 shadow-sm shadow-primary/20'
      : 'bg-primary/15 hover:bg-primary/25 text-primary/80 border-primary/20 active:bg-primary/30',
    warning: isPrimary 
      ? 'bg-orange-500/30 hover:bg-orange-500/40 text-orange-300 border-orange-400/50 active:bg-orange-500/50 shadow-sm shadow-orange-500/20'
      : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400/70 border-orange-500/20 active:bg-orange-500/30',
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        'py-3 px-3 rounded-lg border font-semibold transition-all duration-100',
        'flex items-center justify-center gap-1.5',
        'touch-manipulation select-none',
        'min-h-[44px]', // Maintain accessible tap target
        variantClasses[variant],
        fullWidth && 'col-span-2',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-sm">{label}</span>
      {count !== undefined && (
        <span className="bg-background/50 px-1.5 py-0.5 rounded-full text-xs">{count}</span>
      )}
    </button>
  );
}
