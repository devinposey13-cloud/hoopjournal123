import { format, isPast, isToday } from 'date-fns';
import { ScheduledGame } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { Trash2, MapPin, Clock, Home, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScheduleCardProps {
  game: ScheduledGame;
  onDelete?: (id: string) => void;
}

export function ScheduleCard({ game, onDelete }: ScheduleCardProps) {
  const gameDate = new Date(game.date);
  const isPastGame = isPast(gameDate) && !isToday(gameDate);
  const isTodayGame = isToday(gameDate);

  return (
    <div
      className={cn(
        'stat-card group relative',
        isPastGame && 'opacity-50',
        isTodayGame && 'border-primary/50 shadow-glow'
      )}
    >
      {isTodayGame && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full gradient-primary text-xs font-bold text-primary-foreground">
          TODAY
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-bold uppercase',
              game.isHome
                ? 'bg-green-500/20 text-green-400'
                : 'bg-blue-500/20 text-blue-400'
            )}
          >
            {game.isHome ? (
              <span className="flex items-center gap-1">
                <Home className="w-3 h-3" /> Home
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Plane className="w-3 h-3" /> Away
              </span>
            )}
          </div>
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

      <h3 className="font-semibold text-lg mb-2">vs {game.opponent}</h3>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            {format(gameDate, 'EEEE, MMM d')} at {game.time}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{game.location}</span>
        </div>
      </div>

      {game.notes && (
        <p className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          {game.notes}
        </p>
      )}
    </div>
  );
}
