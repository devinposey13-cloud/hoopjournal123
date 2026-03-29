import { useState, useCallback, useEffect, useRef } from 'react';

interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
  wasReleased: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

export function useWakeLock(): WakeLockState {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [wasReleased, setWasReleased] = useState(false);
  const shouldBeActiveRef = useRef(false);

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const acquire = useCallback(async () => {
    if (!isSupported) return;
    try {
      sentinelRef.current = await navigator.wakeLock.request('screen');
      setIsActive(true);
      setWasReleased(false);
      shouldBeActiveRef.current = true;

      sentinelRef.current.addEventListener('release', () => {
        setIsActive(false);
        setWasReleased(true);
      });
    } catch (e) {
      console.warn('[WakeLock] Failed to acquire:', e);
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    shouldBeActiveRef.current = false;
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch {}
      sentinelRef.current = null;
    }
    setIsActive(false);
    setWasReleased(false);
  }, []);

  // Re-acquire on visibility change (e.g. user switches back to tab/app)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && shouldBeActiveRef.current && !sentinelRef.current?.released === false) {
        // Only reacquire if it was released
        if (!sentinelRef.current || sentinelRef.current.released) {
          acquire();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [acquire]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, []);

  return { isSupported, isActive, wasReleased, request: acquire, release };
}
