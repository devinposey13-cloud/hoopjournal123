import { SeasonStats } from '@/types/basketball';
import { TrendingUp, Target, Users, Activity } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface SeasonAveragesCardProps {
  stats: SeasonStats;
  compact?: boolean;
}

export function SeasonAveragesCard({ stats, compact = false }: SeasonAveragesCardProps) {
  if (stats.gamesPlayed === 0) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          No games logged yet this season. Your averages will appear here after your first game!
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Season Averages
          </h3>
          <span className="text-xs text-muted-foreground">
            ({stats.gamesPlayed} {stats.gamesPlayed === 1 ? 'game' : 'games'})
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          <StatBubble label="PPG" value={stats.avgPoints} />
          <StatBubble label="RPG" value={stats.avgRebounds} />
          <StatBubble label="APG" value={stats.avgAssists} />
          <StatBubble label="SPG" value={stats.avgSteals} />
          <StatBubble label="BPG" value={stats.avgBlocks} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <PercentBubble label="FG%" value={stats.fgPercentage} />
          <PercentBubble label="3P%" value={stats.threePtPercentage} />
          <PercentBubble label="FT%" value={stats.ftPercentage} />
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Season Averages</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {stats.gamesPlayed} {stats.gamesPlayed === 1 ? 'game' : 'games'} played
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary"><AnimatedCounter value={stats.avgPoints} decimals={1} /></div>
          <div className="text-xs text-muted-foreground uppercase">PPG</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.avgRebounds} decimals={1} /></div>
          <div className="text-xs text-muted-foreground uppercase">RPG</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.avgAssists} decimals={1} /></div>
          <div className="text-xs text-muted-foreground uppercase">APG</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.avgSteals} decimals={1} /></div>
          <div className="text-xs text-muted-foreground uppercase">SPG</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold"><AnimatedCounter value={stats.avgBlocks} decimals={1} /></div>
          <div className="text-xs text-muted-foreground uppercase">BPG</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-semibold"><AnimatedCounter value={stats.fgPercentage} decimals={0} suffix="%" /></div>
          <div className="text-xs text-muted-foreground">FG%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold"><AnimatedCounter value={stats.threePtPercentage} decimals={0} suffix="%" /></div>
          <div className="text-xs text-muted-foreground">3P%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold"><AnimatedCounter value={stats.ftPercentage} decimals={0} suffix="%" /></div>
          <div className="text-xs text-muted-foreground">FT%</div>
        </div>
      </div>
    </div>
  );
}

function StatBubble({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/50 rounded-lg py-2 px-1">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function PercentBubble({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/50 rounded-lg py-1.5 px-1">
      <div className="text-sm font-semibold text-foreground">{value}%</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
