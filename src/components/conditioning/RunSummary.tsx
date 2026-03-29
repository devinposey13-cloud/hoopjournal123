import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Clock, MapPin, Zap, Shield, Signal, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { GpsPoint } from '@/hooks/useGpsTracking';
import { RunTrace } from './RunTrace';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { type CoachTrustResult, TRUST_BAND_COLORS } from '@/utils/coachTrust';
import { type ConditioningGradeResult } from '@/utils/conditioningGrade';

interface RunResult {
  points: GpsPoint[];
  distanceMeters: number;
  elapsedSeconds: number;
  pauseCount: number;
  maxSpeed: number;
  averageAccuracy: number;
  gpsPointCount: number;
  verificationStatus: string;
  trackingMode?: 'background' | 'foreground';
  backgroundTrackingEnabled?: boolean;
  coachTrust?: CoachTrustResult;
  conditioningGrade?: ConditioningGradeResult;
}

interface RunSummaryProps {
  result: RunResult;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatPace(distanceMeters: number, elapsedSeconds: number): string {
  if (distanceMeters < 10 || elapsedSeconds < 1) return '--:--';
  const minPerKm = (elapsedSeconds / 60) / (distanceMeters / 1000);
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  gps_verified: { label: 'GPS Verified', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: <Shield className="w-3 h-3" /> },
  low_confidence: { label: 'Low Confidence', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: <Zap className="w-3 h-3" /> },
  suspicious: { label: 'Suspicious', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <X className="w-3 h-3" /> },
  manual_entry: { label: 'Manual Entry', color: 'bg-muted text-muted-foreground border-border', icon: <Clock className="w-3 h-3" /> },
};

export function RunSummary({ result, saving, onSave, onDiscard }: RunSummaryProps) {
  const statusCfg = STATUS_CONFIG[result.verificationStatus] || STATUS_CONFIG.manual_entry;
  const showTrace = result.verificationStatus === 'gps_verified' && result.points.length >= 5;
  const trust = result.coachTrust;
  const trustColors = trust ? TRUST_BAND_COLORS[trust.band] : null;
  const [showTrustDetails, setShowTrustDetails] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="sm" className="text-sm" onClick={onDiscard}>
          Discard
        </Button>
        <p className="font-semibold text-sm">Run Complete</p>
        <div className="w-16" />
      </div>

      <div className="flex-1 px-4 py-6 space-y-4 animate-fade-in">
        {/* Big time */}
        <div className="text-center py-4">
          <p className="text-5xl font-mono font-bold">{formatTime(result.elapsedSeconds)}</p>
          <p className="text-sm text-muted-foreground mt-2">{format(new Date(), 'MMM d, yyyy')}</p>
        </div>

        {/* Status badges row */}
        <div className="flex justify-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
          {result.trackingMode && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border",
              result.trackingMode === 'background'
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-muted text-muted-foreground border-border"
            )}>
              <Signal className="w-3 h-3" />
              {result.trackingMode === 'background' ? 'Background' : 'Foreground'}
            </span>
          )}
        </div>

        {/* Stats grid — 3 columns for screenshot density */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <MapPin className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{formatDistance(result.distanceMeters)}</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div className="text-center">
                <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{formatTime(result.elapsedSeconds)}</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
              <div className="text-center">
                <Zap className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{formatPace(result.distanceMeters, result.elapsedSeconds)}</p>
                <p className="text-xs text-muted-foreground">Pace /km</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coach Trust Score */}
        {trust && trustColors && (
          <Card className={cn("border", trustColors.border)}>
            <CardContent className="p-4">
              <button
                className="w-full text-left"
                onClick={() => setShowTrustDetails(!showTrustDetails)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Score circle */}
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center border-2",
                      trustColors.border, trustColors.bg
                    )}>
                      <span className={cn("text-xl font-bold", trustColors.text)}>
                        {trust.score}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className={cn("w-4 h-4", trustColors.text)} />
                        <p className="text-sm font-semibold">Coach Trust</p>
                      </div>
                      <p className={cn("text-xs font-medium", trustColors.text)}>
                        {trust.bandLabel}
                      </p>
                    </div>
                  </div>
                  {showTrustDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expandable reasons */}
              {showTrustDetails && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5 animate-fade-in">
                  {trust.reasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", trustColors.text.replace('text-', 'bg-'))} />
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Run Trace */}
        {showTrace && <RunTrace points={result.points} />}

        {/* Save button */}
        <Button
          className="w-full gap-2 h-12 text-base"
          onClick={onSave}
          disabled={saving}
        >
          <Check className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Run'}
        </Button>
      </div>
    </div>
  );
}
