import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, PenLine, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RunTracker } from './RunTracker';
import { ManualConditioningEntry } from './ManualConditioningEntry';
import { ConditioningHistory } from './ConditioningHistory';

interface ConditioningHomeProps {
  onBack: () => void;
}

export function ConditioningHome({ onBack }: ConditioningHomeProps) {
  const [view, setView] = useState<'home' | 'run' | 'manual' | 'history'>('home');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  if (view === 'run') return <RunTracker onBack={() => setView('home')} onSaved={() => setView('history')} />;
  if (view === 'manual') return <ManualConditioningEntry onBack={() => setView('home')} onSaved={() => setView('history')} />;
  if (view === 'history') return <ConditioningHistory onBack={() => setView('home')} />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <p className="font-semibold text-sm">Conditioning</p>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('history')}>
          <History className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 px-4 py-6 space-y-3">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold">Track Your Conditioning</h2>
          <p className="text-sm text-muted-foreground">Build endurance, track progress</p>
        </div>

        <button
          onClick={() => setView('run')}
          className={cn(
            "w-full flex items-center gap-4 p-5 rounded-xl border border-border bg-card",
            "hover:bg-accent/50 active:scale-[0.98] transition-all text-left touch-manipulation"
          )}
        >
          <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <Play className="w-5 h-5 ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">Start Run</p>
            <p className="text-xs text-muted-foreground">GPS-tracked run with live stats</p>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
        </button>

        <button
          onClick={() => setView('manual')}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card",
            "hover:bg-accent/50 active:scale-[0.98] transition-all text-left touch-manipulation"
          )}
        >
          <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <PenLine className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Log Conditioning Manually</p>
            <p className="text-xs text-muted-foreground">Record runs, sprints, or other workouts</p>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
        </button>
      </div>
    </div>
  );
}
