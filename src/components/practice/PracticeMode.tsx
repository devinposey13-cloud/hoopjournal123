import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Target, History, Trash2, Undo2, Circle, Flame, Zap } from 'lucide-react';
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

type SessionType = 'ft' | 'mid' | '3pt' | 'full';
type ShotZone = 'ft' | 'mid' | '3pt';
type ShotResult = 'make' | 'miss';

interface ShotAction {
  zone: ShotZone;
  result: ShotResult;
}

const SESSION_OPTIONS: { type: SessionType; label: string; desc: string; icon: React.ReactNode }[] = [
  { type: 'ft', label: 'Free Throws', desc: 'FT shooting focus', icon: <Target className="w-5 h-5" /> },
  { type: 'mid', label: 'Mid Range', desc: 'Pull-up & elbow work', icon: <Flame className="w-5 h-5" /> },
  { type: '3pt', label: '3PT Shooting', desc: 'Beyond the arc', icon: <Circle className="w-5 h-5" /> },
  { type: 'full', label: 'Full Workout', desc: 'All shooting zones', icon: <Zap className="w-5 h-5" /> },
];

const SESSION_TYPE_LABELS: Record<string, string> = {
  ft: 'Free Throws',
  mid: 'Mid Range',
  '3pt': '3PT Shooting',
  full: 'Full Workout',
  shooting: 'Full Workout',
};

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
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const [view, setView] = useState<'select' | 'log' | 'history'>('select');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Shot stats
  const [ftMade, setFtMade] = useState(0);
  const [ftAttempted, setFtAttempted] = useState(0);
  const [midMade, setMidMade] = useState(0);
  const [midAttempted, setMidAttempted] = useState(0);
  const [threeMade, setThreeMade] = useState(0);
  const [threeAttempted, setThreeAttempted] = useState(0);

  const [actionHistory, setActionHistory] = useState<ShotAction[]>([]);

  const totalMade = ftMade + midMade + threeMade;
  const totalAttempted = ftAttempted + midAttempted + threeAttempted;
  const overallPct = totalAttempted > 0 ? Math.round((totalMade / totalAttempted) * 100) : 0;
  const ftPct = ftAttempted > 0 ? Math.round((ftMade / ftAttempted) * 100) : 0;
  const midPct = midAttempted > 0 ? Math.round((midMade / midAttempted) * 100) : 0;
  const threePct = threeAttempted > 0 ? Math.round((threeMade / threeAttempted) * 100) : 0;

  const zonesForSession: ShotZone[] = useMemo(() => {
    if (!sessionType || sessionType === 'full') return ['ft', 'mid', '3pt'];
    return [sessionType as ShotZone];
  }, [sessionType]);

  const isSingleZone = zonesForSession.length === 1;

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

  const handleStartSession = (type: SessionType) => {
    setSessionType(type);
    setFtMade(0); setFtAttempted(0);
    setMidMade(0); setMidAttempted(0);
    setThreeMade(0); setThreeAttempted(0);
    setActionHistory([]);
    setView('log');
  };

  const handleSave = async () => {
    if (!user) return;
    if (totalAttempted === 0) { toast.error('Log at least one shot before saving.'); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('practice_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      practice_type: sessionType || 'full',
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
    setView('select');
    setSessionType(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('practice_sessions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete session'); return; }
    toast.success('Session deleted');
    setHistory(prev => prev.filter(s => s.id !== id));
  };

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter(s => {
      const t = s.practice_type;
      if (historyFilter === 'ft') return t === 'ft';
      if (historyFilter === 'mid') return t === 'mid';
      if (historyFilter === '3pt') return t === '3pt';
      if (historyFilter === 'full') return t === 'full' || t === 'shooting';
      return true;
    });
  }, [history, historyFilter]);

  const zoneLabel = (zone: ShotZone) => zone === 'ft' ? 'Free Throws' : zone === 'mid' ? 'Mid Range' : '3PT';
  const zoneIcon = (zone: ShotZone) => zone === '3pt' ? <Circle className="w-3.5 h-3.5 text-primary" /> : <Target className="w-3.5 h-3.5 text-primary" />;
  const zoneMade = (zone: ShotZone) => zone === 'ft' ? ftMade : zone === 'mid' ? midMade : threeMade;
  const zoneAtt = (zone: ShotZone) => zone === 'ft' ? ftAttempted : zone === 'mid' ? midAttempted : threeAttempted;
  const zonePct = (zone: ShotZone) => {
    const att = zoneAtt(zone);
    return att > 0 ? Math.round((zoneMade(zone) / att) * 100) : 0;
  };

  // ─── Session Type Selection Screen ─────────────────────────
  if (view === 'select') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <p className="font-semibold text-sm">Practice Mode</p>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('history')}>
            <History className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 px-4 py-6 space-y-3">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Start Practice</h2>
            <p className="text-sm text-muted-foreground">Choose your focus for this session</p>
          </div>

          {SESSION_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => handleStartSession(opt.type)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card",
                "hover:bg-accent/50 active:scale-[0.98] transition-all",
                "text-left touch-manipulation"
              )}
            >
              <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Shooting Log Screen ─────────────────────────────────
  if (view === 'log') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setView('select'); setSessionType(null); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-semibold text-sm">{SESSION_TYPE_LABELS[sessionType || 'full']}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Practice</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undoLast} disabled={actionHistory.length === 0}>
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Overall % Display */}
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

          {/* Quick Stats Bar — only for full workout */}
          {!isSingleZone && (
            <div className="grid grid-cols-3 gap-0.5 px-3 py-2">
              {zonesForSession.map(z => (
                <div key={z} className="text-center py-1 bg-card rounded-md">
                  <p className="text-base font-bold">{zoneMade(z)}/{zoneAtt(z)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{z === 'ft' ? 'FT' : z === 'mid' ? 'MID' : '3PT'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Shooting Zones */}
          <div className="flex-1 px-3 py-2 space-y-2 overflow-auto">
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>

            {zonesForSession.map(zone => (
              <div key={zone} className={cn(
                "bg-card rounded-lg border border-border",
                isSingleZone ? "p-4" : "p-2"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {zoneIcon(zone)}
                    <span className={cn("font-medium", isSingleZone ? "text-base" : "text-sm")}>{zoneLabel(zone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-muted-foreground", isSingleZone ? "text-sm" : "text-xs")}>
                      {zoneMade(zone)}/{zoneAtt(zone)} ({zonePct(zone)}%)
                    </span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => undoLastForZone(zone)}
                      disabled={!actionHistory.some(a => a.zone === zone)}
                    >
                      <Undo2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StatButton label="Made" variant="success" emphasis="primary" onPress={() => recordShot(zone, 'make')} />
                  <StatButton label="Miss" variant="danger" emphasis="secondary" onPress={() => recordShot(zone, 'miss')} />
                </div>
                {/* Expanded single-zone: show a larger percentage ring */}
                {isSingleZone && zoneAtt(zone) > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{zoneMade(zone)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Makes</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-3xl font-bold">{zoneAtt(zone) - zoneMade(zone)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Misses</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="text-center">
                      <p className="text-3xl font-bold">{zoneAtt(zone)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="px-3 py-3 border-t border-border bg-card">
            <Button onClick={handleSave} disabled={saving || totalAttempted === 0} className="w-full h-12 text-base font-semibold gap-2">
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Practice Session'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── History Screen ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('select')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="font-semibold text-sm">Practice History</p>
        <div className="w-8" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3 pt-3 pb-1 overflow-x-auto no-scrollbar">
        {['all', 'ft', 'mid', '3pt', 'full'].map(f => (
          <button
            key={f}
            onClick={() => setHistoryFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              historyFilter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent"
            )}
          >
            {f === 'all' ? 'All' : SESSION_TYPE_LABELS[f] || f}
          </button>
        ))}
      </div>

      <div className="flex-1 px-3 py-3 space-y-3 overflow-auto">
        {loadingHistory ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Target className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              {historyFilter === 'all' ? 'No practice sessions yet' : `No ${SESSION_TYPE_LABELS[historyFilter] || historyFilter} sessions`}
            </p>
            <Button variant="outline" size="sm" onClick={() => setView('select')}>Start a Practice</Button>
          </div>
        ) : (
          filteredHistory.map((session) => {
            const total = session.ft_attempted + session.midrange_attempted + session.three_pt_attempted;
            const made = session.ft_made + session.midrange_made + session.three_pt_made;
            const pct = total > 0 ? Math.round((made / total) * 100) : 0;
            const sessionFtPct = session.ft_attempted > 0 ? Math.round((session.ft_made / session.ft_attempted) * 100) : null;
            const sessionMidPct = session.midrange_attempted > 0 ? Math.round((session.midrange_made / session.midrange_attempted) * 100) : null;
            const sessionThreePct = session.three_pt_attempted > 0 ? Math.round((session.three_pt_made / session.three_pt_attempted) * 100) : null;
            const typeLabel = SESSION_TYPE_LABELS[session.practice_type] || session.practice_type;

            return (
              <Card key={session.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(session.created_at), 'MMM d, yyyy · h:mm a')}
                      </span>
                      <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {typeLabel}
                      </span>
                    </div>
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
    </div>
  );
}
