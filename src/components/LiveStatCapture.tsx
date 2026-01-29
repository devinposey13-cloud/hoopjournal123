import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Undo2, 
  Save, 
  Target, 
  Circle,
  Repeat,
  Zap,
  Shield,
  HandMetal,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveStats {
  points: number;
  fgMade: number;
  fgAttempted: number;
  threePtMade: number;
  threePtAttempted: number;
  ftMade: number;
  ftAttempted: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
}

interface StatAction {
  type: keyof LiveStats;
  value: number;
  label: string;
}

interface LiveStatCaptureProps {
  opponent: string;
  initialStats?: Partial<LiveStats>;
  onSave: (stats: LiveStats) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const defaultStats: LiveStats = {
  points: 0,
  fgMade: 0,
  fgAttempted: 0,
  threePtMade: 0,
  threePtAttempted: 0,
  ftMade: 0,
  ftAttempted: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
};

export function LiveStatCapture({ 
  opponent, 
  initialStats, 
  onSave, 
  onCancel,
  isSaving = false 
}: LiveStatCaptureProps) {
  const [stats, setStats] = useState<LiveStats>({ ...defaultStats, ...initialStats });
  const [history, setHistory] = useState<StatAction[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const recordStat = useCallback((action: StatAction) => {
    setStats(prev => {
      const newStats = { ...prev };
      
      // Handle shot makes - also increment attempts and points
      if (action.type === 'fgMade') {
        newStats.fgMade += 1;
        newStats.fgAttempted += 1;
        newStats.points += 2;
      } else if (action.type === 'threePtMade') {
        newStats.threePtMade += 1;
        newStats.threePtAttempted += 1;
        newStats.points += 3;
      } else if (action.type === 'ftMade') {
        newStats.ftMade += 1;
        newStats.ftAttempted += 1;
        newStats.points += 1;
      } else if (action.type === 'fgAttempted') {
        // Miss - only increment attempts
        newStats.fgAttempted += 1;
      } else if (action.type === 'threePtAttempted') {
        newStats.threePtAttempted += 1;
      } else if (action.type === 'ftAttempted') {
        newStats.ftAttempted += 1;
      } else {
        newStats[action.type] += action.value;
      }
      
      return newStats;
    });
    
    setHistory(prev => [...prev, action]);
    setLastAction(action.label);
    
    // Clear the last action indicator after a moment
    setTimeout(() => setLastAction(null), 1500);
  }, []);

  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    
    setStats(prev => {
      const newStats = { ...prev };
      
      // Reverse the action
      if (lastAction.type === 'fgMade') {
        newStats.fgMade -= 1;
        newStats.fgAttempted -= 1;
        newStats.points -= 2;
      } else if (lastAction.type === 'threePtMade') {
        newStats.threePtMade -= 1;
        newStats.threePtAttempted -= 1;
        newStats.points -= 3;
      } else if (lastAction.type === 'ftMade') {
        newStats.ftMade -= 1;
        newStats.ftAttempted -= 1;
        newStats.points -= 1;
      } else if (lastAction.type === 'fgAttempted') {
        newStats.fgAttempted -= 1;
      } else if (lastAction.type === 'threePtAttempted') {
        newStats.threePtAttempted -= 1;
      } else if (lastAction.type === 'ftAttempted') {
        newStats.ftAttempted -= 1;
      } else {
        newStats[lastAction.type] -= lastAction.value;
      }
      
      return newStats;
    });
    
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handleSave = () => {
    onSave(stats);
  };

  const fgPct = stats.fgAttempted > 0 ? Math.round((stats.fgMade / stats.fgAttempted) * 100) : 0;
  const threePct = stats.threePtAttempted > 0 ? Math.round((stats.threePtMade / stats.threePtAttempted) * 100) : 0;
  const ftPct = stats.ftAttempted > 0 ? Math.round((stats.ftMade / stats.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Live Capture</p>
          <p className="font-semibold">vs {opponent}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={undoLast} disabled={history.length === 0}>
          <Undo2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Last Action Indicator */}
      {lastAction && (
        <div className="bg-primary/20 text-primary text-center py-2 text-sm font-medium animate-pulse">
          + {lastAction}
        </div>
      )}

      {/* Points Display */}
      <div className="bg-gradient-to-r from-primary to-primary/80 py-8 text-center">
        <p className="text-6xl font-bold text-primary-foreground">{stats.points}</p>
        <p className="text-primary-foreground/80 uppercase tracking-wider text-sm mt-1">Points</p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-card border-b border-border">
        <div className="text-center py-2">
          <p className="text-lg font-bold">{stats.rebounds}</p>
          <p className="text-[10px] text-muted-foreground uppercase">REB</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{stats.assists}</p>
          <p className="text-[10px] text-muted-foreground uppercase">AST</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{stats.steals}</p>
          <p className="text-[10px] text-muted-foreground uppercase">STL</p>
        </div>
        <div className="text-center py-2">
          <p className="text-lg font-bold">{stats.blocks}</p>
          <p className="text-[10px] text-muted-foreground uppercase">BLK</p>
        </div>
      </div>

      {/* Remote Buttons */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Shooting Section */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Shooting</h3>
          
          {/* 2PT Field Goals */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">2PT Field Goals</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.fgMade - stats.threePtMade}/{stats.fgAttempted - stats.threePtAttempted} ({fgPct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'fgMade', value: 1, label: '2PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'fgAttempted', value: 1, label: '2PT Miss' })}
              />
            </div>
          </div>

          {/* 3PT Field Goals */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary" />
                <span className="font-medium">3PT Field Goals</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.threePtMade}/{stats.threePtAttempted} ({threePct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'threePtMade', value: 1, label: '3PT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'threePtAttempted', value: 1, label: '3PT Miss' })}
              />
            </div>
          </div>

          {/* Free Throws */}
          <div className="bg-card rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">Free Throws</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.ftMade}/{stats.ftAttempted} ({ftPct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatButton 
                label="Made" 
                variant="success"
                onPress={() => recordStat({ type: 'ftMade', value: 1, label: 'FT Made' })}
              />
              <StatButton 
                label="Miss" 
                variant="danger"
                onPress={() => recordStat({ type: 'ftAttempted', value: 1, label: 'FT Miss' })}
              />
            </div>
          </div>
        </div>

        {/* Other Stats Section */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Other Stats</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <StatButton 
              label="Rebound" 
              icon={Repeat}
              count={stats.rebounds}
              variant="primary"
              onPress={() => recordStat({ type: 'rebounds', value: 1, label: 'Rebound' })}
            />
            <StatButton 
              label="Assist" 
              icon={Zap}
              count={stats.assists}
              variant="primary"
              onPress={() => recordStat({ type: 'assists', value: 1, label: 'Assist' })}
            />
            <StatButton 
              label="Steal" 
              icon={Shield}
              count={stats.steals}
              variant="primary"
              onPress={() => recordStat({ type: 'steals', value: 1, label: 'Steal' })}
            />
            <StatButton 
              label="Block" 
              icon={HandMetal}
              count={stats.blocks}
              variant="primary"
              onPress={() => recordStat({ type: 'blocks', value: 1, label: 'Block' })}
            />
          </div>

          <StatButton 
            label="Turnover" 
            icon={AlertCircle}
            count={stats.turnovers}
            variant="warning"
            onPress={() => recordStat({ type: 'turnovers', value: 1, label: 'Turnover' })}
            fullWidth
          />
        </div>
      </div>

      {/* Save Footer */}
      <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1 gradient-primary">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Stats'}
        </Button>
      </div>
    </div>
  );
}

interface StatButtonProps {
  label: string;
  icon?: React.ElementType;
  count?: number;
  variant: 'success' | 'danger' | 'primary' | 'warning';
  onPress: () => void;
  fullWidth?: boolean;
}

function StatButton({ label, icon: Icon, count, variant, onPress, fullWidth }: StatButtonProps) {
  const variantClasses = {
    success: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30 active:bg-green-500/40',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30 active:bg-red-500/40',
    primary: 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 active:bg-primary/40',
    warning: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-orange-500/30 active:bg-orange-500/40',
  };

  return (
    <button
      onClick={onPress}
      className={cn(
        'py-4 px-4 rounded-xl border font-semibold transition-all duration-100',
        'flex items-center justify-center gap-2',
        'touch-manipulation select-none',
        variantClasses[variant],
        fullWidth && 'col-span-2'
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{label}</span>
      {count !== undefined && (
        <span className="bg-background/50 px-2 py-0.5 rounded-full text-sm">{count}</span>
      )}
    </button>
  );
}
