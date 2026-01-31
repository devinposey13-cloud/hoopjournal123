import { useEffect, useCallback, useRef } from 'react';
import { HalfStats } from '@/types/basketball';

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

interface TeamScore {
  us: number;
  them: number;
}

interface AutosaveData {
  opponent: string;
  currentHalf: 1 | 2;
  firstHalfStats: LiveStats;
  secondHalfStats: LiveStats;
  history: StatAction[];
  gamePhoto: string | null;
  isWin: boolean | null;
  soundEffectsEnabled: boolean;
  halftimeScore?: TeamScore | null;
  finalScore?: TeamScore | null;
  savedAt: number;
}

const STORAGE_KEY = 'hoopjournal_live_stats_autosave';
const AUTOSAVE_INTERVAL = 10000; // 10 seconds

export function useLiveStatsAutosave(opponent: string) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there's saved data for this opponent
  const getSavedData = useCallback((): AutosaveData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data: AutosaveData = JSON.parse(stored);
      
      // Check if the data is for the same opponent (case-insensitive)
      if (data.opponent?.toLowerCase() !== opponent?.toLowerCase()) {
        return null;
      }
      
      // Check if data is less than 24 hours old
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - data.savedAt > maxAge) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading autosave data:', error);
      return null;
    }
  }, [opponent]);

  // Save current state to localStorage
  const saveData = useCallback((data: Omit<AutosaveData, 'savedAt'>) => {
    try {
      const savePayload: AutosaveData = {
        ...data,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savePayload));
    } catch (error) {
      console.error('Error saving autosave data:', error);
    }
  }, []);

  // Clear saved data (call when stats are successfully saved to server)
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing autosave data:', error);
    }
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((data: Omit<AutosaveData, 'savedAt'>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveData(data);
    }, 500); // Debounce by 500ms
  }, [saveData]);

  // Immediate save (for visibility change events)
  const immediateSave = useCallback((data: Omit<AutosaveData, 'savedAt'>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveData(data);
  }, [saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    getSavedData,
    saveData: debouncedSave,
    immediateSave,
    clearSavedData,
  };
}
