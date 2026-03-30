import { useState, useCallback, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, Square, MapPin, Smartphone, Signal, AlertTriangle } from 'lucide-react';
import { useGpsTracking, getVerificationStatus, GpsPoint } from '@/hooks/useGpsTracking';
import { useBackgroundLocation, NativeLocationPoint } from '@/hooks/useBackgroundLocation';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RunSummary } from './RunSummary';
import { calculateCoachTrust, type CoachTrustResult } from '@/utils/coachTrust';
import { calculateConditioningGrade, type ConditioningGradeResult } from '@/utils/conditioningGrade';

interface RunTrackerProps {
  onBack: () => void;
  onSaved: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_SPEED_MS = 12;
const MIN_DISTANCE_METERS = 3;

/**
 * Merge foreground browser GPS points with native background points.
 * Native points fill gaps where the foreground GPS was paused (app backgrounded).
 * Returns merged points sorted by timestamp with recalculated distance.
 */
function mergeGpsPoints(
  foregroundPoints: GpsPoint[],
  nativePoints: NativeLocationPoint[]
): { mergedPoints: GpsPoint[]; totalDistance: number; maxSpeed: number; avgAccuracy: number } {
  if (nativePoints.length === 0) {
    // No native data — use foreground as-is
    const totalDist = calculateDistanceFromPoints(foregroundPoints);
    const maxSpd = foregroundPoints.reduce((m, p) => Math.max(m, p.speed ?? 0), 0);
    const avgAcc = foregroundPoints.length > 0
      ? foregroundPoints.reduce((s, p) => s + p.accuracy, 0) / foregroundPoints.length
      : 0;
    return { mergedPoints: foregroundPoints, totalDistance: totalDist, maxSpeed: maxSpd, avgAccuracy: avgAcc };
  }

  // Convert native points to GpsPoint format
  const convertedNative: GpsPoint[] = nativePoints
    .filter(p => p.horizontalAccuracy <= 30)
    .map(p => ({
      lat: p.latitude,
      lng: p.longitude,
      accuracy: p.horizontalAccuracy,
      timestamp: p.gpsTimestamp ?? p.timestamp,
      speed: p.speed !== null && p.speed >= 0 ? p.speed : null,
    }));

  if (convertedNative.length === 0) {
    const totalDist = calculateDistanceFromPoints(foregroundPoints);
    const maxSpd = foregroundPoints.reduce((m, p) => Math.max(m, p.speed ?? 0), 0);
    const avgAcc = foregroundPoints.length > 0
      ? foregroundPoints.reduce((s, p) => s + p.accuracy, 0) / foregroundPoints.length
      : 0;
    return { mergedPoints: foregroundPoints, totalDistance: totalDist, maxSpeed: maxSpd, avgAccuracy: avgAcc };
  }

  // Find time gaps in foreground data (>5 seconds between points = potential background gap)
  const GAP_THRESHOLD_MS = 5000;
  const allPoints: GpsPoint[] = [...foregroundPoints];

  // For each gap in foreground data, fill with native points from that window
  for (let i = 1; i < foregroundPoints.length; i++) {
    const gap = foregroundPoints[i].timestamp - foregroundPoints[i - 1].timestamp;
    if (gap > GAP_THRESHOLD_MS) {
      const gapStart = foregroundPoints[i - 1].timestamp;
      const gapEnd = foregroundPoints[i].timestamp;
      const fillers = convertedNative.filter(p => p.timestamp > gapStart && p.timestamp < gapEnd);
      allPoints.push(...fillers);
    }
  }

  // Also append native points that extend beyond the last foreground point
  if (foregroundPoints.length > 0) {
    const lastFg = foregroundPoints[foregroundPoints.length - 1].timestamp;
    const trailing = convertedNative.filter(p => p.timestamp > lastFg);
    allPoints.push(...trailing);
  }

  // Deduplicate by removing points too close in time (<1s)
  const sorted = allPoints.sort((a, b) => a.timestamp - b.timestamp);
  const deduped: GpsPoint[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp - deduped[deduped.length - 1].timestamp >= 1000) {
      deduped.push(sorted[i]);
    }
  }

  const totalDist = calculateDistanceFromPoints(deduped);
  const maxSpd = deduped.reduce((m, p) => Math.max(m, p.speed ?? 0), 0);
  const avgAcc = deduped.reduce((s, p) => s + p.accuracy, 0) / deduped.length;

  return { mergedPoints: deduped, totalDistance: totalDist, maxSpeed: maxSpd, avgAccuracy: avgAcc };
}

function calculateDistanceFromPoints(points: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
    const speed = timeDiff > 0 ? dist / timeDiff : 0;
    if (dist < MIN_DISTANCE_METERS) continue;
    if (speed > MAX_SPEED_MS) continue;
    total += dist;
  }
  return total;
}

interface RunResult {
  points: GpsPoint[];
  distanceMeters: number;
  elapsedSeconds: number;
  pauseCount: number;
  maxSpeed: number;
  averageAccuracy: number;
  gpsPointCount: number;
  verificationStatus: string;
  trackingMode: 'background' | 'foreground';
  backgroundTrackingEnabled: boolean;
  coachTrust: CoachTrustResult;
  conditioningGrade: ConditioningGradeResult;
}

export const RunTracker = forwardRef<HTMLDivElement, RunTrackerProps>(function RunTracker({ onBack, onSaved }, ref) {
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();
  const gps = useGpsTracking();
  const bgLocation = useBackgroundLocation();
  const wakeLock = useWakeLock();
  const [phase, setPhase] = useState<'idle' | 'running' | 'summary'>('idle');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [showResumeWarning, setShowResumeWarning] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  // Show warning toast when wake lock is released unexpectedly during a run
  useEffect(() => {
    if (phase === 'running' && wakeLock.wasReleased && !wakeLock.isActive) {
      toast.warning('Screen lock released — keep screen on for accurate tracking', { duration: 4000 });
    }
  }, [phase, wakeLock.wasReleased, wakeLock.isActive]);

  // Handle app resume — show warning if tracking may have been interrupted
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && phase === 'running') {
        // If NOT using native background tracking, foreground GPS may have been interrupted
        if (!bgLocation.isNativeActive) {
          setShowResumeWarning(true);
          setTimeout(() => setShowResumeWarning(false), 6000);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, bgLocation.isNativeActive]);

  const handleStart = useCallback(async () => {
    const ok = await gps.startTracking();
    if (!ok) return;

    setPhase('running');

    // Try to enable native background tracking
    const nativeOk = await bgLocation.startNativeTracking();

    if (nativeOk) {
      toast.success('Tracking will continue if you lock your phone', { duration: 3000, icon: '📍' });
    } else if (bgLocation.isNativeSupported) {
      toast.info('Keep the app open for best tracking', { duration: 3000 });
    }

    // Request wake lock as additional layer
    await wakeLock.request();
    if (!wakeLock.isSupported && !nativeOk) {
      toast.info('Keep your screen awake manually for best tracking accuracy', { duration: 5000 });
    }
  }, [gps, bgLocation, wakeLock]);

  const handleFinish = useCallback(async () => {
    const result = gps.stopTracking();
    const nativePoints = await bgLocation.stopNativeTracking();
    const wasBackground = nativePoints.length > 0;

    // Merge foreground + native background points for best coverage
    const merged = mergeGpsPoints(result.points, nativePoints);

    // Use merged data if it provides better coverage (more distance or more points)
    const useMerged = merged.mergedPoints.length > result.points.length || 
                      merged.totalDistance > result.distanceMeters;

    const finalPoints = useMerged ? merged.mergedPoints : result.points;
    const finalDistance = useMerged ? merged.totalDistance : result.distanceMeters;
    const finalMaxSpeed = Math.max(useMerged ? merged.maxSpeed : result.maxSpeed, result.maxSpeed);
    const finalAvgAccuracy = useMerged ? merged.avgAccuracy : result.averageAccuracy;
    const finalPointCount = finalPoints.length;

    if (useMerged && nativePoints.length > 0) {
      console.log(`[RunTracker] Merged ${nativePoints.length} native points with ${result.points.length} foreground points → ${finalPointCount} total`);
    }

    const status = getVerificationStatus(
      finalPointCount, finalAvgAccuracy, finalMaxSpeed, false
    );

    const trackingMode = wasBackground ? 'background' as const : 'foreground' as const;

    const coachTrust = calculateCoachTrust({
      trackingMode,
      backgroundTrackingEnabled: bgLocation.isNativeSupported,
      wasInterrupted: bgLocation.wasInterrupted,
      averageAccuracy: finalAvgAccuracy,
      pauseCount: result.pauseCount,
      maxSpeed: finalMaxSpeed,
      gpsPointCount: finalPointCount,
      isManual: false,
      elapsedSeconds: result.elapsedSeconds,
      distanceMeters: finalDistance,
    });

    const conditioningGrade = calculateConditioningGrade({
      distanceMeters: finalDistance,
      elapsedSeconds: result.elapsedSeconds,
      coachTrustBand: coachTrust.band,
    });

    setRunResult({
      points: finalPoints,
      distanceMeters: finalDistance,
      elapsedSeconds: result.elapsedSeconds,
      pauseCount: result.pauseCount,
      maxSpeed: finalMaxSpeed,
      averageAccuracy: finalAvgAccuracy,
      gpsPointCount: finalPointCount,
      verificationStatus: status,
      trackingMode,
      backgroundTrackingEnabled: bgLocation.isNativeSupported,
      coachTrust,
      conditioningGrade,
    });
    setPhase('summary');
    setConfirmStop(false);
    await wakeLock.release();
  }, [gps, bgLocation, wakeLock]);

  const handleSave = useCallback(async () => {
    if (!user || !runResult) return;
    setSaving(true);

    const minimalPoints = runResult.points.map(p => ({
      lat: Math.round(p.lat * 100000) / 100000,
      lng: Math.round(p.lng * 100000) / 100000,
    }));

    const { error } = await (supabase as any).from('conditioning_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      activity_type: 'run',
      start_time: new Date(runResult.points[0]?.timestamp || Date.now()).toISOString(),
      end_time: new Date().toISOString(),
      elapsed_seconds: runResult.elapsedSeconds,
      total_distance_meters: Math.round(runResult.distanceMeters * 100) / 100,
      gps_points: minimalPoints,
      gps_point_count: runResult.gpsPointCount,
      average_accuracy: Math.round(runResult.averageAccuracy * 10) / 10,
      max_speed: Math.round(runResult.maxSpeed * 100) / 100,
      pause_count: runResult.pauseCount,
      verification_status: runResult.verificationStatus,
      is_manual: false,
      tracking_mode: runResult.trackingMode,
      background_tracking_enabled: runResult.backgroundTrackingEnabled,
      coach_trust_score: runResult.coachTrust.score,
      coach_trust_band: runResult.coachTrust.band,
      trust_reasons: runResult.coachTrust.reasons,
      conditioning_grade: runResult.conditioningGrade.grade,
      grade_label: runResult.conditioningGrade.gradeLabel || null,
    });

    setSaving(false);
    if (error) {
      console.error('Failed to save run:', error);
      toast.error('Failed to save run');
      return;
    }
    toast.success('Run saved! 🏃');
    onSaved();
  }, [user, activeProfileId, runResult, onSaved]);

  // Release wake lock and stop native tracking on unmount
  useEffect(() => {
    return () => {
      wakeLock.release();
      bgLocation.stopNativeTracking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary view
  if (phase === 'summary' && runResult) {
    return (
      <RunSummary
        result={runResult}
        saving={saving}
        onSave={handleSave}
        onDiscard={() => { setRunResult(null); setPhase('idle'); onBack(); }}
      />
    );
  }

  // Idle — waiting to start
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b border-border px-3 py-2 flex items-center sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <p className="font-semibold text-sm ml-2">Run Tracking</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-6">
          <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Ready to Run?</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              GPS will track your route, distance, and pace in real time.
            </p>
            {bgLocation.isNativeSupported && (
              <p className="text-xs text-muted-foreground max-w-xs">
                Tracking continues even if you lock your phone.
              </p>
            )}
          </div>
          {gps.error && (
            <p className="text-sm text-destructive text-center">{gps.error}</p>
          )}
          <Button size="lg" className="w-full max-w-xs gap-2 text-base" onClick={handleStart}>
            <Play className="w-5 h-5" />
            Start Run
          </Button>
        </div>
      </div>
    );
  }

  // Running view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Resume warning banner */}
      {showResumeWarning && !bgLocation.isNativeActive && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-400">
            Tracking may have been interrupted while app was in background
          </p>
          <button
            className="ml-auto text-yellow-400/60 hover:text-yellow-400 text-xs"
            onClick={() => setShowResumeWarning(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dark header with live stats */}
      <div className="bg-card border-b border-border px-4 py-4 space-y-4">
        {/* Timer - primary */}
        <div className="text-center">
          <p className="text-5xl font-mono font-bold tracking-tight">
            {formatTime(gps.elapsedSeconds)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {gps.isPaused ? 'Paused' : 'Running'}
          </p>
        </div>

        {/* Distance & Pace */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatDistance(gps.distanceMeters)}</p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{gps.currentPace || '--:--'}</p>
            <p className="text-xs text-muted-foreground">Pace /km</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="flex gap-4 w-full max-w-xs">
          {gps.isPaused ? (
            <>
              <Button
                size="lg"
                className="flex-1 gap-2 h-16 text-base"
                onClick={gps.resumeTracking}
              >
                <Play className="w-5 h-5" />
                Resume
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 gap-2 h-16 text-base"
                onClick={() => {
                  if (confirmStop) handleFinish();
                  else setConfirmStop(true);
                }}
              >
                <Square className="w-5 h-5" />
                {confirmStop ? 'Confirm' : 'Finish'}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              className="w-full gap-2 h-16 text-base"
              onClick={gps.pauseTracking}
            >
              <Pause className="w-5 h-5" />
              Pause
            </Button>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className="px-4 pb-6 flex flex-col items-center gap-2">
        {/* GPS indicator */}
        <div className={cn(
          "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full",
          gps.points.length > 0 ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            gps.points.length > 0 ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
          )} />
          {gps.points.length > 0 ? `GPS Active · ${gps.points.length} pts` : 'Acquiring GPS...'}
        </div>

        {/* Tracking mode indicator */}
        {bgLocation.isNativeActive ? (
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-500/15 text-green-400">
            <Signal className="w-3 h-3" />
            Background Tracking Enabled
          </div>
        ) : bgLocation.isNativeSupported ? (
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-yellow-500/15 text-yellow-400">
            <Signal className="w-3 h-3" />
            Foreground Only
          </div>
        ) : null}

        {/* Wake lock indicator */}
        <div className={cn(
          "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full",
          wakeLock.isActive
            ? "bg-blue-500/15 text-blue-400"
            : wakeLock.isSupported
              ? "bg-yellow-500/15 text-yellow-400"
              : "bg-muted text-muted-foreground"
        )}>
          <Smartphone className="w-3 h-3" />
          {wakeLock.isActive
            ? 'Screen Stay-On Active'
            : wakeLock.isSupported
              ? 'Screen lock released'
              : 'Manual screen-on needed'}
        </div>
      </div>
    </div>
  );
});
