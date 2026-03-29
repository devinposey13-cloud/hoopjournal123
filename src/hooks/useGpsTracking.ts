import { useState, useRef, useCallback, useEffect } from 'react';

export interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
}

export interface GpsTrackingState {
  isTracking: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  distanceMeters: number;
  points: GpsPoint[];
  currentPace: string | null;
  error: string | null;
  pauseCount: number;
  maxSpeed: number;
  averageAccuracy: number;
}

const MIN_ACCURACY_METERS = 30;
const MIN_DISTANCE_METERS = 3;
const MAX_SPEED_MS = 12; // ~43 km/h, filter unrealistic jumps
const SMOOTHING_FACTOR = 0.3;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return '--:--';
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function useGpsTracking() {
  const [state, setState] = useState<GpsTrackingState>({
    isTracking: false,
    isPaused: false,
    elapsedSeconds: 0,
    distanceMeters: 0,
    points: [],
    currentPace: null,
    error: null,
    pauseCount: 0,
    maxSpeed: 0,
    averageAccuracy: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsRef = useRef<GpsPoint[]>([]);
  const distanceRef = useRef(0);
  const pauseCountRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported' }));
      return false;
    }

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000,
        });
      });
    } catch {
      setState(s => ({ ...s, error: 'Location permission denied' }));
      return false;
    }

    pointsRef.current = [];
    distanceRef.current = 0;
    pauseCountRef.current = 0;
    maxSpeedRef.current = 0;
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    pauseStartRef.current = null;
    isPausedRef.current = false;

    setState({
      isTracking: true, isPaused: false, elapsedSeconds: 0,
      distanceMeters: 0, points: [], currentPace: null, error: null,
      pauseCount: 0, maxSpeed: 0, averageAccuracy: 0,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (isPausedRef.current) return;
        const { latitude, longitude, accuracy, speed } = pos.coords;
        if (accuracy > MIN_ACCURACY_METERS) return;

        const point: GpsPoint = {
          lat: latitude, lng: longitude,
          accuracy, timestamp: pos.timestamp,
          speed: speed ?? null,
        };

        const prev = pointsRef.current;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = haversineDistance(last.lat, last.lng, latitude, longitude);
          const timeDiff = (pos.timestamp - last.timestamp) / 1000;
          const calcSpeed = timeDiff > 0 ? dist / timeDiff : 0;

          if (dist < MIN_DISTANCE_METERS) return;
          if (calcSpeed > MAX_SPEED_MS) return;

          distanceRef.current += dist;
          if (calcSpeed > maxSpeedRef.current) maxSpeedRef.current = calcSpeed;

          setState(s => ({
            ...s,
            distanceMeters: distanceRef.current,
            currentPace: calcSpeed > 0.5 ? formatPace(calcSpeed) : s.currentPace,
            maxSpeed: maxSpeedRef.current,
          }));
        }

        pointsRef.current = [...prev, point];
        const totalAcc = pointsRef.current.reduce((sum, p) => sum + p.accuracy, 0);
        setState(s => ({
          ...s,
          points: pointsRef.current,
          averageAccuracy: totalAcc / pointsRef.current.length,
        }));
      },
      (err) => {
        console.warn('GPS error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
        setState(s => ({ ...s, elapsedSeconds: elapsed }));
      }
    }, 1000);

    return true;
  }, []);

  const pauseTracking = useCallback(() => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    pauseCountRef.current += 1;
    setState(s => ({ ...s, isPaused: true, pauseCount: pauseCountRef.current }));
  }, []);

  const resumeTracking = useCallback(() => {
    if (pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    isPausedRef.current = false;
    setState(s => ({ ...s, isPaused: false }));
  }, []);

  const stopTracking = useCallback(() => {
    if (isPausedRef.current && pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
    }
    stopWatch();
    setState(s => ({ ...s, isTracking: false, isPaused: false }));

    return {
      points: pointsRef.current,
      distanceMeters: distanceRef.current,
      elapsedSeconds: Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000),
      pauseCount: pauseCountRef.current,
      maxSpeed: maxSpeedRef.current,
      averageAccuracy: pointsRef.current.length > 0
        ? pointsRef.current.reduce((s, p) => s + p.accuracy, 0) / pointsRef.current.length
        : 0,
      gpsPointCount: pointsRef.current.length,
    };
  }, [stopWatch]);

  useEffect(() => {
    return () => { stopWatch(); };
  }, [stopWatch]);

  return {
    ...state,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
  };
}

export function getVerificationStatus(
  pointCount: number,
  avgAccuracy: number,
  maxSpeed: number,
  isManual: boolean
): string {
  if (isManual) return 'manual_entry';
  if (pointCount < 5) return 'low_confidence';
  if (avgAccuracy > 20) return 'low_confidence';
  if (maxSpeed > 10) return 'suspicious';
  return 'gps_verified';
}
