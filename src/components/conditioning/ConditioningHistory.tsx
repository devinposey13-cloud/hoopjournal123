import { useState, useEffect, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Trash2, MapPin, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RunTrace } from './RunTrace';
import { GpsPoint } from '@/hooks/useGpsTracking';

interface ConditioningSession {
  id: string;
  activity_type: string;
  elapsed_seconds: number | null;
  total_distance_meters: number | null;
  verification_status: string;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  gps_points: any[];
  gps_point_count: number;
}

interface ConditioningHistoryProps {
  onBack: () => void;
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  gps_verified: { label: 'GPS Verified', className: 'bg-green-500/15 text-green-400' },
  low_confidence: { label: 'Low Confidence', className: 'bg-yellow-500/15 text-yellow-400' },
  suspicious: { label: 'Suspicious', className: 'bg-red-500/15 text-red-400' },
  manual_entry: { label: 'Manual', className: 'bg-muted text-muted-foreground' },
};

export function ConditioningHistory({ onBack }: ConditioningHistoryProps) {
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [sessions, setSessions] = useState<ConditioningSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const query = (supabase as any)
      .from('conditioning_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (activeProfileId) {
      query.or(`profile_id.eq.${activeProfileId},profile_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [user, activeProfileId]);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('conditioning_sessions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Session deleted');
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-3 py-2 flex items-center sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="font-semibold text-sm ml-2">Conditioning History</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-muted-foreground">No conditioning sessions yet</p>
            <p className="text-xs text-muted-foreground">Start a run to see your history</p>
          </div>
        ) : (
          sessions.map(session => {
            const status = STATUS_LABELS[session.verification_status] || STATUS_LABELS.manual_entry;
            const hasTrace = session.verification_status === 'gps_verified' &&
              session.gps_points && session.gps_points.length >= 5;

            return (
              <Card key={session.id} className="border-border overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm capitalize">{session.activity_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", status.className)}>
                        {status.label}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(session.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    {session.elapsed_seconds != null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{formatTime(session.elapsed_seconds)}</span>
                      </div>
                    )}
                    {session.total_distance_meters != null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{formatDistance(session.total_distance_meters)}</span>
                      </div>
                    )}
                  </div>

                  {session.notes && (
                    <p className="text-xs text-muted-foreground italic">"{session.notes}"</p>
                  )}

                  {hasTrace && (
                    <RunTrace points={session.gps_points.map((p: any) => ({
                      lat: p.lat, lng: p.lng, accuracy: 0, timestamp: 0, speed: null,
                    }))} />
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
