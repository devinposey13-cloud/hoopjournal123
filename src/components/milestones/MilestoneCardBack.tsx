import { format } from 'date-fns';
import { Trophy, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { PlayerMilestone, MilestoneRarity } from '@/types/milestone';

const RARITY_CONFIG: Record<MilestoneRarity, {
  gradient: string;
  border: string;
  text: string;
}> = {
  common: {
    gradient: 'from-slate-500 to-slate-700',
    border: 'border-slate-400/50',
    text: 'text-slate-300',
  },
  uncommon: {
    gradient: 'from-green-500 to-emerald-700',
    border: 'border-green-400/50',
    text: 'text-green-400',
  },
  rare: {
    gradient: 'from-amber-400 to-yellow-600',
    border: 'border-amber-400/60',
    text: 'text-amber-400',
  },
  epic: {
    gradient: 'from-purple-500 to-violet-700',
    border: 'border-purple-400/60',
    text: 'text-purple-400',
  },
  legendary: {
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    border: 'border-orange-400/70',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500',
  },
};

interface MilestoneCardBackProps {
  milestoneName: string;
  rarity: MilestoneRarity;
  occurrences: PlayerMilestone[];
  gamesMap?: Map<string, { opponent: string }>;
  onFlipBack: () => void;
}

export function MilestoneCardBack({
  milestoneName,
  rarity,
  occurrences,
  gamesMap,
  onFlipBack,
}: MilestoneCardBackProps) {
  const rarityConfig = RARITY_CONFIG[rarity];
  const count = occurrences.length;

  return (
    <div 
      className={cn(
        'absolute inset-0 rounded-xl border bg-card p-4 flex flex-col',
        'backface-hidden rotate-y-180',
        rarityConfig.border
      )}
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className={cn('w-5 h-5', rarityConfig.text)} />
          <span className={cn('font-bold', rarityConfig.text)}>
            Earned {count}×
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlipBack();
          }}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Flip back"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm mb-3 line-clamp-1">{milestoneName}</h4>

      {/* Scrollable history log */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2.5">
          {occurrences
            .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
            .map((occurrence, index) => {
              // Try to get opponent from game data first, then fall back to snapshot
              const gameData = occurrence.gameId ? gamesMap?.get(occurrence.gameId) : undefined;
              const opponent = gameData?.opponent || occurrence.statsSnapshot?.opponent;
              const stats = occurrence.statsSnapshot;
              
              return (
                <div 
                  key={occurrence.id}
                  className={cn(
                    'rounded-lg p-2.5 border border-border/50 bg-muted/30',
                    index === 0 && 'bg-primary/10 border-primary/30'
                  )}
                >
                  {/* Date and opponent */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {format(new Date(occurrence.earnedAt), 'MMM d, yyyy')}
                    </span>
                    {index === 0 && (
                      <span className="text-[10px] uppercase font-bold text-primary">Latest</span>
                    )}
                  </div>
                  
                  {opponent && (
                    <div className="text-xs text-muted-foreground mb-1">
                      vs {opponent}
                    </div>
                  )}
                  
                  {/* Stats */}
                  {stats && (stats.points !== undefined || stats.seasonPoints !== undefined) && (
                    <div className="text-xs text-muted-foreground">
                      {stats.points !== undefined && (
                        <span className="font-medium text-foreground">{stats.points} PTS</span>
                      )}
                      {stats.rebounds !== undefined && stats.rebounds > 0 && (
                        <span> • {stats.rebounds} REB</span>
                      )}
                      {stats.assists !== undefined && stats.assists > 0 && (
                        <span> • {stats.assists} AST</span>
                      )}
                      {/* Season stats for cumulative milestones */}
                      {stats.seasonPoints !== undefined && (
                        <span className="font-medium text-foreground">{stats.seasonPoints} Season PTS</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
