import { format } from 'date-fns';
import { GameStats } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameCardProps {
  game: GameStats;
  onDelete?: (id: string) => void;
}

export function GameCard({ game, onDelete }: GameCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-bold uppercase',
              game.isWin
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {game.isWin ? 'Win' : 'Loss'}
          </div>
          <span className="text-sm text-muted-foreground">
            {format(new Date(game.date), 'MMM d, yyyy')}
          </span>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(game.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <h3 className="font-semibold text-lg mb-4">vs {game.opponent}</h3>
      
      <div className="grid grid-cols-4 gap-4">
        <StatItem label="PTS" value={game.points} highlight />
        <StatItem label="REB" value={game.rebounds} />
        <StatItem label="AST" value={game.assists} />
        <StatItem label="STL" value={game.steals} />
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-4">
        <StatItem
          label="FG"
          value={`${game.fgMade}/${game.fgAttempted}`}
          subValue={
            game.fgAttempted > 0
              ? `${Math.round((game.fgMade / game.fgAttempted) * 100)}%`
              : '0%'
          }
        />
        <StatItem
          label="3PT"
          value={`${game.threePtMade}/${game.threePtAttempted}`}
          subValue={
            game.threePtAttempted > 0
              ? `${Math.round((game.threePtMade / game.threePtAttempted) * 100)}%`
              : '0%'
          }
        />
        <StatItem
          label="FT"
          value={`${game.ftMade}/${game.ftAttempted}`}
          subValue={
            game.ftAttempted > 0
              ? `${Math.round((game.ftMade / game.ftAttempted) * 100)}%`
              : '0%'
          }
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  subValue,
  highlight,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          'font-bold',
          highlight ? 'text-xl text-primary' : 'text-base text-foreground'
        )}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}
