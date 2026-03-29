import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ConditioningHome } from '@/components/conditioning/ConditioningHome';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Target, History, Trash2, Undo2, Circle, Flame, Zap, Trophy, TrendingUp, Check, Footprints } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FireCelebration } from '@/components/FireCelebration';
import { StatFlash } from '@/components/StatFlash';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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

const DEFAULT_GOAL = 50;

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

function StatButton({ label, variant, emphasis = 'primary', onPress, large = false }: {
  label: string;
  variant: 'success' | 'danger';
  emphasis?: 'primary' | 'secondary';
  onPress: () => void;
  large?: boolean;
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
        'rounded-lg border font-semibold transition-all duration-100',
        'flex items-center justify-center gap-1.5',
        'touch-manipulation select-none',
        large ? 'py-6 px-4 min-h-[72px]' : 'py-3 px-3 min-h-[44px]',
        variantClasses[variant]
      )}
    >
      <span className={large ? "text-lg" : "text-sm"}>{label}</span>
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
  const [view, setView] = useState<'select' | 'log' | 'history' | 'summary' | 'conditioning'>('select');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [sessionGoal] = useState(DEFAULT_GOAL);

  // Feedback state — matches LiveStatCapture
  const [showFireCelebration, setShowFireCelebration] = useState(false);
  const [flashState, setFlashState] = useState<{ show: boolean; emoji: string; message: string; variant: 'success' | 'danger' | 'warning' | 'neutral' }>({
    show: false, emoji: '', message: '', variant: 'neutral'
  });
  const flashKeyRef = useRef(0);
  const { playSound } = useSoundEffects();
  const { triggerHaptic } = useHapticFeedback();

  // Shot stats
  const [ftMade, setFtMade] = useState(0);
  const [ftAttempted, setFtAttempted] = useState(0);
  const [midMade, setMidMade] = useState(0);
  const [midAttempted, setMidAttempted] = useState(0);
  const [threeMade, setThreeMade] = useState(0);
  const [threeAttempted, setThreeAttempted] = useState(0);

  // Streak
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [actionHistory, setActionHistory] = useState<ShotAction[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const totalMade = ftMade + midMade + threeMade;
  const totalAttempted = ftAttempted + midAttempted + threeAttempted;
  const overallPct = totalAttempted > 0 ? Math.round((totalMade / totalAttempted) * 100) : 0;
  const ftPct = ftAttempted > 0 ? Math.round((ftMade / ftAttempted) * 100) : 0;
  const midPct = midAttempted > 0 ? Math.round((midMade / midAttempted) * 100) : 0;
  const threePct = threeAttempted > 0 ? Math.round((threeMade / threeAttempted) * 100) : 0;
  const goalProgress = Math.min(100, Math.round((totalAttempted / sessionGoal) * 100));

  const zonesForSession: ShotZone[] = useMemo(() => {
    if (!sessionType || sessionType === 'full') return ['ft', 'mid', '3pt'];
    return [sessionType as ShotZone];
  }, [sessionType]);

  const isSingleZone = zonesForSession.length === 1;

  // Recompute streak from action history
  const recomputeStreak = useCallback((actions: ShotAction[]) => {
    let streak = 0;
    for (let i = actions.length - 1; i >= 0; i--) {
      if (actions[i].result === 'make') streak++;
      else break;
    }
    setCurrentStreak(streak);
    // best streak across entire history
    let best = 0, run = 0;
    for (const a of actions) {
      if (a.result === 'make') { run++; if (run > best) best = run; }
      else { run = 0; }
    }
    setBestStreak(best);
  }, []);

  const triggerFlash = useCallback((result: ShotResult, zone: ShotZone) => {
    flashKeyRef.current += 1;
    if (result === 'make') {
      setShowFireCelebration(true);
      setTimeout(() => setShowFireCelebration(false), 800);
      playSound?.('make');
      triggerHaptic?.('success');
    } else {
      const zoneLabels: Record<ShotZone, string> = { ft: 'FT', mid: 'MID', '3pt': '3PT' };
      setFlashState({ show: true, emoji: '❌', message: `${zoneLabels[zone]} MISS`, variant: 'danger' });
      setTimeout(() => setFlashState(prev => ({ ...prev, show: false })), 900);
      playSound?.('miss');
      triggerHaptic?.('error');
    }
  }, [playSound, triggerHaptic]);

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
    const newActions = [...actionHistory, { zone, result }];
    setActionHistory(newActions);
    recomputeStreak(newActions);
    triggerFlash(result, zone);
  }, [actionHistory, recomputeStreak, triggerFlash]);

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

    const newActions = [...actionHistory.slice(0, actualIdx), ...actionHistory.slice(actualIdx + 1)];
    setActionHistory(newActions);
    recomputeStreak(newActions);
    toast.info(`Undid ${zone.toUpperCase()} ${action.result}`, { duration: 1500, icon: '↩️' });
  }, [actionHistory, recomputeStreak]);

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
    const newActions = actionHistory.slice(0, -1);
    setActionHistory(newActions);
    recomputeStreak(newActions);
  }, [actionHistory, recomputeStreak]);

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
    setCurrentStreak(0);
    setBestStreak(0);
    setSessionStartTime(new Date());
    setView('log');
  };

  const handleFinishPractice = () => {
    if (totalAttempted === 0) { toast.error('Log at least one shot before finishing.'); return; }
    setView('summary');
  };

  const handleSaveSummary = async () => {
    if (!user) return;
    setSaving(true);
    const durationMin = sessionStartTime
      ? Math.round((Date.now() - sessionStartTime.getTime()) / 60000)
      : null;
    const { error } = await (supabase as any).from('practice_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      practice_type: sessionType || 'full',
      ft_made: ftMade, ft_attempted: ftAttempted,
      midrange_made: midMade, midrange_attempted: midAttempted,
      three_pt_made: threeMade, three_pt_attempted: threeAttempted,
      duration_minutes: durationMin,
    });
    setSaving(false);
    if (error) { console.error('Failed to save practice session:', error); toast.error('Failed to save practice session'); return; }
    toast.success('Practice session saved! 🏀');
    setFtMade(0); setFtAttempted(0); setMidMade(0); setMidAttempted(0);
    setThreeMade(0); setThreeAttempted(0); setActionHistory([]);
    setCurrentStreak(0); setBestStreak(0);
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
  const zoneIcon = (zone: ShotZone, size = 'w-3.5 h-3.5') => zone === '3pt'
    ? <Circle className={cn(size, "text-primary")} />
    : zone === 'mid' ? <Flame className={cn(size, "text-primary")} />
    : <Target className={cn(size, "text-primary")} />;
  const zoneMade = (zone: ShotZone) => zone === 'ft' ? ftMade : zone === 'mid' ? midMade : threeMade;
  const zoneAtt = (zone: ShotZone) => zone === 'ft' ? ftAttempted : zone === 'mid' ? midAttempted : threeAttempted;
  const zonePct = (zone: ShotZone) => {
    const att = zoneAtt(zone);
    return att > 0 ? Math.round((zoneMade(zone) / att) * 100) : 0;
  };

  const practiceXp = Math.round(totalMade * 2 + totalAttempted * 0.5);

  // ─── Conditioning View ─────────────────────────────────────
  if (view === 'conditioning') {
    return <ConditioningHome onBack={() => setView('select')} />;
  }

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

          {/* Conditioning card */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">Training</p>
            <button
              onClick={() => setView('conditioning')}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card",
                "hover:bg-accent/50 active:scale-[0.98] transition-all",
                "text-left touch-manipulation"
              )}
            >
              <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Footprints className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Conditioning</p>
                <p className="text-xs text-muted-foreground">Track runs and conditioning workouts</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Summary Modal Screen ────────────────────────────────
  if (view === 'summary') {
    const durationMin = sessionStartTime
      ? Math.max(1, Math.round((Date.now() - sessionStartTime.getTime()) / 60000))
      : null;
    const insight = overallPct >= 60
      ? "🔥 Elite shooting session! Keep it up."
      : overallPct >= 45
      ? "💪 Solid work. Consistency is building."
      : overallPct >= 30
      ? "📈 Room to grow. Focus on form next time."
      : "🎯 Keep grinding. Every rep counts.";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('log')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <p className="font-semibold text-sm">Practice Summary</p>
          <div className="w-8" />
        </div>

        <div className="flex-1 px-4 py-6 space-y-4 animate-fade-in">
          {/* Big percentage */}
          <div className="text-center py-6">
            <p className="text-6xl font-bold">{overallPct}%</p>
            <p className="text-muted-foreground text-sm mt-1">{totalMade} / {totalAttempted} shots made</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{bestStreak}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Best Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">+{practiceXp}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Practice XP</p>
              </CardContent>
            </Card>
            {durationMin && (
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{durationMin}<span className="text-sm font-normal text-muted-foreground">m</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{totalAttempted}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Shots</p>
              </CardContent>
            </Card>
          </div>

          {/* Zone breakdown */}
          {zonesForSession.length > 1 && (
            <div className="space-y-1.5">
              {zonesForSession.map(z => zoneAtt(z) > 0 && (
                <div key={z} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border">
                  <div className="flex items-center gap-2">
                    {zoneIcon(z)}
                    <span className="text-sm font-medium">{zoneLabel(z)}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{zoneMade(z)}/{zoneAtt(z)} ({zonePct(z)}%)</span>
                </div>
              ))}
            </div>
          )}

          {/* Insight */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-sm">{insight}</p>
          </div>
        </div>

        {/* Save button */}
        <div className="px-4 py-4 border-t border-border bg-card">
          <Button onClick={handleSaveSummary} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
            <Check className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Shooting Log Screen ─────────────────────────────────
  if (view === 'log') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Feedback overlays — same as LiveStatCapture */}
        <FireCelebration show={showFireCelebration} />
        <StatFlash
          key={flashKeyRef.current}
          show={flashState.show}
          emoji={flashState.emoji}
          message={flashState.message}
          variant={flashState.variant}
        />

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
          {/* Enhanced Banner */}
          <div className="bg-gradient-to-r from-primary to-primary/80 py-3 text-center mt-2 mx-3 rounded-lg relative overflow-hidden">
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className={cn(
                  "text-4xl font-bold text-primary-foreground tabular-nums",
                  totalAttempted === 0 && "opacity-50"
                )}>
                  {totalAttempted > 0 ? `${overallPct}%` : '—'}
                </p>
                <p className="text-primary-foreground/70 text-xs mt-0.5">
                  {totalMade} / {totalAttempted} shots
                </p>
              </div>
              {/* Streak badge */}
              {currentStreak >= 2 && (
                <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-lg px-3 py-1.5 animate-scale-in">
                  <p className="text-primary-foreground text-lg font-bold tabular-nums">🔥 {currentStreak}</p>
                  <p className="text-primary-foreground/70 text-[9px] uppercase">Streak</p>
                </div>
              )}
            </div>

            {/* Goal progress bar */}
            <div className="mx-4 mt-2">
              <div className="flex items-center justify-between text-[9px] text-primary-foreground/60 mb-0.5">
                <span>Goal</span>
                <span>{totalAttempted} / {sessionGoal}</span>
              </div>
              <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-foreground/80 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
            </div>

            {/* XP earned */}
            {totalAttempted > 0 && (
              <p className="text-primary-foreground/50 text-[10px] mt-1.5">+{practiceXp} XP</p>
            )}
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
            {!isSingleZone && (
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>
            )}

            {zonesForSession.map(zone => (
              <div key={zone} className={cn(
                "bg-card rounded-lg border border-border",
                isSingleZone ? "p-5" : "p-2"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    {zoneIcon(zone, isSingleZone ? 'w-5 h-5' : 'w-3.5 h-3.5')}
                    <span className={cn("font-semibold", isSingleZone ? "text-lg" : "text-sm")}>{zoneLabel(zone)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-muted-foreground tabular-nums", isSingleZone ? "text-sm" : "text-xs")}>
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
                <div className="grid grid-cols-2 gap-3">
                  <StatButton label="Made" variant="success" emphasis="primary" large={isSingleZone} onPress={() => recordShot(zone, 'make')} />
                  <StatButton label="Miss" variant="danger" emphasis="secondary" large={isSingleZone} onPress={() => recordShot(zone, 'miss')} />
                </div>

                {/* Single-zone expanded stats */}
                {isSingleZone && zoneAtt(zone) > 0 && (
                  <div className="mt-5 flex items-center justify-center gap-8">
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
                      <p className="text-3xl font-bold">{bestStreak}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Best Run</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Finish button */}
          <div className="px-3 py-3 border-t border-border bg-card">
            <Button onClick={handleFinishPractice} disabled={totalAttempted === 0} className="w-full h-12 text-base font-semibold gap-2">
              <Trophy className="w-5 h-5" />
              Finish Practice
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
                    {session.duration_minutes && <span>{session.duration_minutes}m</span>}
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
