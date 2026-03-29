import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, MapPin, Zap, Shield } from 'lucide-react';
import { GpsPoint } from '@/hooks/useGpsTracking';
import { RunTrace } from './RunTrace';
import { format } from 'date-fns';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  gps_verified: { label: 'GPS Verified', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: <Shield className="w-3 h-3" /> },
  low_confidence: { label: 'Low Confidence', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: <Zap className="w-3 h-3" /> },
  suspicious: { label: 'Suspicious', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <X className="w-3 h-3" /> },
  manual_entry: { label: 'Manual Entry', color: 'bg-muted text-muted-foreground border-border', icon: <Clock className="w-3 h-3" /> },
};

export function RunSummary({ result, saving, onSave, onDiscard }: RunSummaryProps) {
  const statusCfg = STATUS_CONFIG[result.verificationStatus] || STATUS_CONFIG.manual_entry;
  const showTrace = result.verificationStatus === 'gps_verified' && result.points.length >= 5;

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

        {/* Status badge */}
        <div className="flex justify-center">
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
              {result.trackingMode === 'background' ? 'Tracked in Background' : 'Tracked in Foreground'}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <MapPin className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{formatDistance(result.distanceMeters)}</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div className="text-center">
                <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{formatTime(result.elapsedSeconds)}</p>
                <p className="text-xs text-muted-foreground">Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
