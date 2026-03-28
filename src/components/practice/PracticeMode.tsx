import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Target, History, Trash2, Undo2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PracticeSession {
  id: string;
  practice_type: string;
  ft_made: number;
  ft_attempted: number;
  midrange_made: number;
  midrange_attempted: number;
  three_pt_made: number;
  three_pt_attempted: number;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
}

type ShotZone = 'ft' | 'mid' | '3pt';
type ShotResult = 'make' | 'miss';

interface ShotAction {
  zone: ShotZone;
  result: ShotResult;
}

// Matches LiveStatCapture's StatButton
function StatButton({ label, variant, emphasis = 'primary', onPress }: {
  label: string;
  variant: 'success' | 'danger';
  emphasis?: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const isPrimary = emphasis === 'primary';
  const variantClasses = {
    success: isPrimary
      ? 'bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-400/50 active:bg-green-500/50 shadow-sm shadow-green-500/20'
      : 'bg-green-500/15 hover:bg-green-500/25 text-green-400/80 border-green-500/20 active:bg-green-500/30',
    danger: isPrimary
      ? 'bg-red-500/30 hover:bg-red-500/40 text-red-300 border-red-400/50 active:bg-red-500/50 shadow-sm shadow-red-500/20'
      : 'bg-red-500/15 hover:bg-red-500/25 text-red-400/70 border-red-500/20 active:bg-red-500/30',
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        'py-3 px-3 rounded-lg border font-semibold transition-all duration-100',
        'flex items-center justify-center gap-1.5',
        'touch-manipulation select-none',
        'min-h-[44px]',
        variantClasses[variant]
      )}
    >
      <span className="text-sm">{label}</span>
    </button>
  );
}

interface PracticeModeProps {
  onBack: () => void;
}

export function PracticeMode({ onBack }: PracticeModeProps) {
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();
  const [view, setView] = useState<'log' | 'history'>('log');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Shot stats
  const [ftMade, setFtMade] = useState(0);
  const [ftAttempted, setFtAttempted] = useState(0);
  const [midMade, setMidMade] = useState(0);
  const [midAttempted, setMidAttempted] = useState(0);
  const [threeMade, setThreeMade] = useState(0);
  const [threeAttempted, setThreeAttempted] = useState(0);

  // Action history for undo
  const [actionHistory, setActionHistory] = useState<ShotAction[]>([]);

  const totalMade = ftMade + midMade + threeMade;
  const totalAttempted = ftAttempted + midAttempted + threeAttempted;
  const overallPct = totalAttempted > 0 ? Math.round((totalMade / totalAttempted) * 100) : 0;
  const ftPct = ftAttempted > 0 ? Math.round((ftMade / ftAttempted) * 100) : 0;
  const midPct = midAttempted > 0 ? Math.round((midMade / midAttempted) * 100) : 0;
  const threePct = threeAttempted > 0 ? Math.round((threeMade / threeAttempted) * 100) : 0;

  const recordShot = useCallback((zone: ShotZone, result: ShotResult) => {
    if (zone === 'ft') {
      if (result === 'make') { setFtMade(p => p + 1); setFtAttempted(p => p + 1); }
      else { setFtAttempted(p => p + 1); }
    } else if (zone === 'mid') {
      if (result === 'make') { setMidMade(p => p + 1); setMidAttempted(p => p + 1); }
      else { setMidAttempted(p => p + 1); }
    } else {
      if (result === 'make') { setThreeMade(p => p + 1); setThreeAttempted(p => p + 1); }
      else { setThreeAttempted(p => p + 1); }
    }
    setActionHistory(prev => [...prev, { zone, result }]);
  }, []);

  const undoLastForZone = useCallback((zone: ShotZone) => {
    const lastIdx = [...actionHistory].reverse().findIndex(a => a.zone === zone);
    if (lastIdx === -1) { toast.info(`No ${zone.toUpperCase()} shots to undo`, { duration: 1500 }); return; }
    const actualIdx = actionHistory.length - 1 - lastIdx;
    const action = actionHistory[actualIdx];

    if (action.zone === 'ft') {
      if (action.result === 'make') { setFtMade(p => Math.max(0, p - 1)); setFtAttempted(p => Math.max(0, p - 1)); }
      else { setFtAttempted(p => Math.max(0, p - 1)); }
    } else if (action.zone === 'mid') {
      if (action.result === 'make') { setMidMade(p => Math.max(0, p - 1)); setMidAttempted(p => Math.max(0, p - 1)); }
      else { setMidAttempted(p => Math.max(0, p - 1)); }
    } else {
      if (action.result === 'make') { setThreeMade(p => Math.max(0, p - 1)); setThreeAttempted(p => Math.max(0, p - 1)); }
      else { setThreeAttempted(p => Math.max(0, p - 1)); }
    }

    setActionHistory(prev => [...prev.slice(0, actualIdx), ...prev.slice(actualIdx + 1)]);
    toast.info(`Undid ${zone.toUpperCase()} ${action.result}`, { duration: 1500, icon: '↩️' });
  }, [actionHistory]);

  const undoLast = useCallback(() => {
    if (actionHistory.length === 0) return;
    const last = actionHistory[actionHistory.length - 1];
    if (last.zone === 'ft') {
      if (last.result === 'make') { setFtMade(p => Math.max(0, p - 1)); setFtAttempted(p => Math.max(0, p - 1)); }
      else { setFtAttempted(p => Math.max(0, p - 1)); }
    } else if (last.zone === 'mid') {
      if (last.result === 'make') { setMidMade(p => Math.max(0, p - 1)); setMidAttempted(p => Math.max(0, p - 1)); }
      else { setMidAttempted(p => Math.max(0, p - 1)); }
    } else {
      if (last.result === 'make') { setThreeMade(p => Math.max(0, p - 1)); setThreeAttempted(p => Math.max(0, p - 1)); }
      else { setThreeAttempted(p => Math.max(0, p - 1)); }
    }
    setActionHistory(prev => prev.slice(0, -1));
  }, [actionHistory]);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const query = (supabase as any)
      .from('practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (activeProfileId) {
      query.or(`profile_id.eq.${activeProfileId},profile_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data) setHistory(data as PracticeSession[]);
    setLoadingHistory(false);
  };

  useEffect(() => { fetchHistory(); }, [user, activeProfileId]);

  const handleSave = async () => {
    if (!user) return;
    if (totalAttempted === 0) { toast.error('Log at least one shot before saving.'); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('practice_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      practice_type: 'shooting',
      ft_made: ftMade, ft_attempted: ftAttempted,
      midrange_made: midMade, midrange_attempted: midAttempted,
      three_pt_made: threeMade, three_pt_attempted: threeAttempted,
    });
    setSaving(false);
    if (error) { console.error('Failed to save practice session:', error); toast.error('Failed to save practice session'); return; }
    toast.success('Practice session saved! 🏀');
    setFtMade(0); setFtAttempted(0); setMidMade(0); setMidAttempted(0);
    setThreeMade(0); setThreeAttempted(0); setActionHistory([]);
    fetchHistory();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('practice_sessions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete session'); return; }
    toast.success('Session deleted');
    setHistory(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Compact, matching LiveStatCapture */}
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">Practice Mode</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shooting</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undoLast} disabled={actionHistory.length === 0}>
          <Undo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 bg-muted/50 p-1 mx-3 mt-2 rounded-lg">
        <button
          onClick={() => setView('log')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
            view === 'log' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Target className="w-4 h-4" /> Log Practice
        </button>
        <button
          onClick={() => setView('history')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
            view === 'history' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <History className="w-4 h-4" /> History
          {history.length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{history.length}</span>
          )}
        </button>
      </div>

      {view === 'log' && (
        <div className="flex-1 flex flex-col">
          {/* Overall % Display - Gradient banner like LiveStatCapture points */}
          <div className="bg-gradient-to-r from-primary to-primary/80 py-3 text-center mt-2 mx-3 rounded-lg">
            <p className={cn(
              "text-4xl font-bold text-primary-foreground",
              totalAttempted === 0 && "opacity-50"
            )}>
              {totalAttempted > 0 ? `${overallPct}%` : '—'}
            </p>
            <p className="text-primary-foreground/70 text-xs mt-1">
              {totalMade} / {totalAttempted} total shots
            </p>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-0.5 px-3 py-2">
            <div className="text-center py-1 bg-card rounded-md">
              <p className="text-base font-bold">{ftMade}/{ftAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">FT</p>
            </div>
            <div className="text-center py-1 bg-card rounded-md">
              <p className="text-base font-bold">{midMade}/{midAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">MID</p>
            </div>
            <div className="text-center py-1 bg-card rounded-md">
              <p className="text-base font-bold">{threeMade}/{threeAttempted}</p>
              <p className="text-[9px] text-muted-foreground uppercase">3PT</p>
            </div>
          </div>

          {/* Shooting Zones - Matching LiveStatCapture layout */}
          <div className="flex-1 px-3 py-2 space-y-2 overflow-auto">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>

            {/* Free Throws */}
            <div className="bg-card rounded-lg p-2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-sm">FT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {ftMade}/{ftAttempted} ({ftPct}%)
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => undoLastForZone('ft')}
                    disabled={!actionHistory.some(a => a.zone === 'ft')}
                  >
                    <Undo2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatButton label="Made" variant="success" emphasis="primary" onPress={() => recordShot('ft', 'make')} />
                <StatButton label="Miss" variant="danger" emphasis="secondary" onPress={() => recordShot('ft', 'miss')} />
              </div>
            </div>

            {/* Mid Range */}
            <div className="bg-card rounded-lg p-2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-sm">Mid Range</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {midMade}/{midAttempted} ({midPct}%)
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => undoLastForZone('mid')}
                    disabled={!actionHistory.some(a => a.zone === 'mid')}
                  >
                    <Undo2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatButton label="Made" variant="success" emphasis="primary" onPress={() => recordShot('mid', 'make')} />
                <StatButton label="Miss" variant="danger" emphasis="secondary" onPress={() => recordShot('mid', 'miss')} />
              </div>
            </div>

            {/* 3-Pointers */}
            <div className="bg-card rounded-lg p-2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-sm">3PT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {threeMade}/{threeAttempted} ({threePct}%)
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => undoLastForZone('3pt')}
                    disabled={!actionHistory.some(a => a.zone === '3pt')}
                  >
                    <Undo2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatButton label="Made" variant="success" emphasis="primary" onPress={() => recordShot('3pt', 'make')} />
                <StatButton label="Miss" variant="danger" emphasis="secondary" onPress={() => recordShot('3pt', 'miss')} />
              </div>
            </div>
          </div>

          {/* Save button - sticky bottom */}
          <div className="px-3 py-3 border-t border-border bg-card">
            <Button onClick={handleSave} disabled={saving || totalAttempted === 0} className="w-full h-12 text-base font-semibold gap-2">
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Practice Session'}
            </Button>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="flex-1 px-3 py-3 space-y-3 overflow-auto">
          {loadingHistory ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Target className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No practice sessions yet</p>
              <Button variant="outline" size="sm" onClick={() => setView('log')}>Log Your First Practice</Button>
            </div>
          ) : (
            history.map((session) => {
              const total = session.ft_attempted + session.midrange_attempted + session.three_pt_attempted;
              const made = session.ft_made + session.midrange_made + session.three_pt_made;
              const pct = total > 0 ? Math.round((made / total) * 100) : 0;
              const sessionFtPct = session.ft_attempted > 0 ? Math.round((session.ft_made / session.ft_attempted) * 100) : null;
              const sessionMidPct = session.midrange_attempted > 0 ? Math.round((session.midrange_made / session.midrange_attempted) * 100) : null;
              const sessionThreePct = session.three_pt_attempted > 0 ? Math.round((session.three_pt_made / session.three_pt_attempted) * 100) : null;

              return (
                <Card key={session.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(session.created_at), 'MMM d, yyyy · h:mm a')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-lg font-bold tabular-nums",
                          pct >= 50 ? "text-green-500" : pct >= 30 ? "text-yellow-500" : "text-red-400"
                        )}>
                          {pct}%
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(session.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{made}/{total} total</span>
                      {sessionFtPct !== null && <span>FT: {sessionFtPct}%</span>}
                      {sessionMidPct !== null && <span>Mid: {sessionMidPct}%</span>}
                      {sessionThreePct !== null && <span>3PT: {sessionThreePct}%</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
