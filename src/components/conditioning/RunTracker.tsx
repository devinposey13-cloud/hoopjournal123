import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pause, Play, Square, MapPin, Smartphone } from 'lucide-react';
import { useGpsTracking, getVerificationStatus, GpsPoint } from '@/hooks/useGpsTracking';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RunSummary } from './RunSummary';

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

interface RunResult {
  points: GpsPoint[];
  distanceMeters: number;
  elapsedSeconds: number;
  pauseCount: number;
  maxSpeed: number;
  averageAccuracy: number;
  gpsPointCount: number;
  verificationStatus: string;
}

export function RunTracker({ onBack, onSaved }: RunTrackerProps) {
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();
  const gps = useGpsTracking();
  const wakeLock = useWakeLock();
  const [phase, setPhase] = useState<'idle' | 'running' | 'summary'>('idle');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  // Show warning toast when wake lock is released unexpectedly during a run
  useEffect(() => {
    if (phase === 'running' && wakeLock.wasReleased && !wakeLock.isActive) {
      toast.warning('Screen lock released — keep screen on for accurate tracking', { duration: 4000 });
    }
  }, [phase, wakeLock.wasReleased, wakeLock.isActive]);

  const handleStart = useCallback(async () => {
    const ok = await gps.startTracking();
    if (ok) {
      setPhase('running');
      await wakeLock.request();
      if (!wakeLock.isSupported) {
        toast.info('Keep your screen awake manually for best tracking accuracy', { duration: 5000 });
      }
    }
  }, [gps, wakeLock]);

  const handleFinish = useCallback(async () => {
    const result = gps.stopTracking();
    const status = getVerificationStatus(
      result.gpsPointCount, result.averageAccuracy, result.maxSpeed, false
    );
    setRunResult({ ...result, verificationStatus: status });
    setPhase('summary');
    setConfirmStop(false);
    await wakeLock.release();
  }, [gps, wakeLock]);

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

  // Release wake lock on unmount (e.g. navigating away)
  useEffect(() => {
    return () => {
      wakeLock.release();
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
}
