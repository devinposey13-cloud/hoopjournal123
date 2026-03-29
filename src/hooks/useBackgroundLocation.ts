import { useState, useRef, useCallback, useEffect } from 'react';
import { isDespia } from '@/lib/platform';

export type TrackingMode = 'background' | 'foreground';

export interface BackgroundLocationState {
  /** Whether Despia native background tracking is supported */
  isNativeSupported: boolean;
  /** Whether native background tracking is currently active */
  isNativeActive: boolean;
  /** Current tracking mode */
  trackingMode: TrackingMode;
  /** Whether tracking was interrupted (e.g. native failed mid-run) */
  wasInterrupted: boolean;
  /** Start native background tracking alongside browser GPS */
  startNativeTracking: () => Promise<boolean>;
  /** Stop native background tracking and retrieve accumulated points */
  stopNativeTracking: () => Promise<NativeLocationPoint[]>;
  /** Clear interrupted state */
  clearInterrupted: () => void;
}

export interface NativeLocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  gpsTimestamp?: number;
  speed: number | null;
  course: number | null;
  altitude: number;
  horizontalAccuracy: number;
  verticalAccuracy: number;
}

const BUFFER_SECONDS = 5; // GPS update interval for native tracking

export function useBackgroundLocation(): BackgroundLocationState {
  const isNativeSupported = isDespia();
  const [isNativeActive, setIsNativeActive] = useState(false);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const nativeActiveRef = useRef(false);

  const startNativeTracking = useCallback(async (): Promise<boolean> => {
    if (!isNativeSupported) return false;

    try {
      const despiaModule = await import('despia-native');
      const despia = (despiaModule.default || despiaModule) as any;

      // Start native background location — local-only (no server param)
      despia(`location://?buffer=${BUFFER_SECONDS}`);

      console.log('[BackgroundLocation] Native tracking started');
      setIsNativeActive(true);
      nativeActiveRef.current = true;
      setWasInterrupted(false);
      return true;
    } catch (err) {
      console.warn('[BackgroundLocation] Failed to start native tracking:', err);
      setIsNativeActive(false);
      nativeActiveRef.current = false;
      return false;
    }
  }, [isNativeSupported]);

  const stopNativeTracking = useCallback(async (): Promise<NativeLocationPoint[]> => {
    if (!nativeActiveRef.current) return [];

    try {
      const despiaModule = await import('despia-native');
      const despia = (despiaModule.default || despiaModule) as any;

      const data = await despia('stoplocation://', ['locationSession']);
      const locations: NativeLocationPoint[] = data?.locationSession ?? [];

      console.log(`[BackgroundLocation] Stopped — retrieved ${locations.length} native points`);
      setIsNativeActive(false);
      nativeActiveRef.current = false;
      return locations;
    } catch (err) {
      console.warn('[BackgroundLocation] Failed to stop native tracking:', err);
      setIsNativeActive(false);
      nativeActiveRef.current = false;
      return [];
    }
  }, []);

  const clearInterrupted = useCallback(() => {
    setWasInterrupted(false);
  }, []);

  // Handle app resume — detect if native tracking was lost
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && nativeActiveRef.current) {
        // Native tracking should still be active; if the user returns,
        // we just continue. The native layer handles background independently.
        console.log('[BackgroundLocation] App resumed — native tracking should still be active');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nativeActiveRef.current) {
        // Fire-and-forget stop on unmount
        import('despia-native').then(mod => {
          const despia = (mod.default || mod) as any;
          despia('stoplocation://', ['locationSession']).catch(() => {});
        }).catch(() => {});
        nativeActiveRef.current = false;
      }
    };
  }, []);

  const trackingMode: TrackingMode = isNativeActive ? 'background' : 'foreground';

  return {
    isNativeSupported,
    isNativeActive,
    trackingMode,
    wasInterrupted,
    startNativeTracking,
    stopNativeTracking,
    clearInterrupted,
  };
}
