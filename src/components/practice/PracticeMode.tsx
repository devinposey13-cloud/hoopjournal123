import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Minus, Plus, Target, History, Trash2 } from 'lucide-react';
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

interface StatStepperProps {
  label: string;
  makes: number;
  attempts: number;
  onMakesChange: (v: number) => void;
  onAttemptsChange: (v: number) => void;
}

function StatStepper({ label, makes, attempts, onMakesChange, onAttemptsChange }: StatStepperProps) {
  const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;

  const increment = (current: number, setter: (v: number) => void) => setter(current + 1);
  const decrement = (current: number, setter: (v: number) => void) => setter(Math.max(0, current - 1));

  // When makes increase, auto-bump attempts if needed
  const handleMakesUp = () => {
    const newMakes = makes + 1;
    onMakesChange(newMakes);
    if (newMakes > attempts) onAttemptsChange(newMakes);
  };

  const handleMakesDown = () => {
    onMakesChange(Math.max(0, makes - 1));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground uppercase tracking-wide">{label}</span>
        <span className={cn(
          "text-lg font-bold tabular-nums",
          attempts > 0 ? (pct >= 50 ? "text-green-500" : pct >= 30 ? "text-yellow-500" : "text-red-400") : "text-muted-foreground"
        )}>
          {attempts > 0 ? `${pct}%` : '—'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Makes */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Makes</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={handleMakesDown}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold tabular-nums text-center flex-1">{makes}</span>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={handleMakesUp}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Attempts */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Attempts</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => decrement(attempts, onAttemptsChange)}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xl font-bold tabular-nums text-center flex-1">{attempts}</span>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => increment(attempts, onAttemptsChange)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        {makes} / {attempts}
      </div>
    </div>
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

  // Shooting stats
  const [ftMade, setFtMade] = useState(0);
  const [ftAttempted, setFtAttempted] = useState(0);
  const [midMade, setMidMade] = useState(0);
  const [midAttempted, setMidAttempted] = useState(0);
  const [threeMade, setThreeMade] = useState(0);
  const [threeAttempted, setThreeAttempted] = useState(0);

  const totalMade = ftMade + midMade + threeMade;
  const totalAttempted = ftAttempted + midAttempted + threeAttempted;
  const overallPct = totalAttempted > 0 ? Math.round((totalMade / totalAttempted) * 100) : 0;

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const query = supabase
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

  useEffect(() => {
    fetchHistory();
  }, [user, activeProfileId]);

  const handleSave = async () => {
    if (!user) return;
    if (totalAttempted === 0) {
      toast.error('Log at least one shot attempt before saving.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('practice_sessions').insert({
      user_id: user.id,
      profile_id: activeProfileId || null,
      practice_type: 'shooting',
      ft_made: ftMade,
      ft_attempted: ftAttempted,
      midrange_made: midMade,
      midrange_attempted: midAttempted,
      three_pt_made: threeMade,
      three_pt_attempted: threeAttempted,
    });
    setSaving(false);

    if (error) {
      console.error('Failed to save practice session:', error);
      toast.error('Failed to save practice session');
      return;
    }

    toast.success('Practice session saved! 🏀');
    // Reset
    setFtMade(0); setFtAttempted(0);
    setMidMade(0); setMidAttempted(0);
    setThreeMade(0); setThreeAttempted(0);
    fetchHistory();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('practice_sessions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete session');
      return;
    }
    toast.success('Session deleted');
    setHistory(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Practice Mode</h2>
          <p className="text-xs text-muted-foreground">Track your shooting sessions</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 bg-muted/50 rounded-lg p-1">
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
        <div className="space-y-4">
          {/* Summary bar */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shots</p>
                <p className="text-2xl font-bold tabular-nums">{totalMade} / {totalAttempted}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall</p>
                <p className={cn(
                  "text-3xl font-bold tabular-nums",
                  totalAttempted > 0 ? (overallPct >= 50 ? "text-green-500" : overallPct >= 30 ? "text-yellow-500" : "text-red-400") : "text-muted-foreground"
                )}>
                  {totalAttempted > 0 ? `${overallPct}%` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shot zone steppers */}
          <StatStepper label="🎯 Free Throws" makes={ftMade} attempts={ftAttempted} onMakesChange={setFtMade} onAttemptsChange={setFtAttempted} />
          <StatStepper label="🏀 Mid Range" makes={midMade} attempts={midAttempted} onMakesChange={setMidMade} onAttemptsChange={setMidAttempted} />
          <StatStepper label="🔥 3-Pointers" makes={threeMade} attempts={threeAttempted} onMakesChange={setThreeMade} onAttemptsChange={setThreeAttempted} />

          {/* Save button */}
          <Button onClick={handleSave} disabled={saving || totalAttempted === 0} className="w-full h-12 text-base font-semibold gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Practice Session'}
          </Button>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-3">
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
              const ftPct = session.ft_attempted > 0 ? Math.round((session.ft_made / session.ft_attempted) * 100) : null;
              const midPct = session.midrange_attempted > 0 ? Math.round((session.midrange_made / session.midrange_attempted) * 100) : null;
              const threePct = session.three_pt_attempted > 0 ? Math.round((session.three_pt_made / session.three_pt_attempted) * 100) : null;

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
                      {ftPct !== null && <span>FT: {ftPct}%</span>}
                      {midPct !== null && <span>Mid: {midPct}%</span>}
                      {threePct !== null && <span>3PT: {threePct}%</span>}
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
