import { forwardRef } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { ScheduledGame, GameStats } from '@/types/basketball';
import { cn } from '@/lib/utils';
import { Trash2, MapPin, Clock, Home, Plane, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScheduleCardProps {
  game: ScheduledGame;
  linkedGame?: GameStats;
  onDelete?: (id: string) => void;
}

export const ScheduleCard = forwardRef<HTMLDivElement, ScheduleCardProps>(
  function ScheduleCard({ game, linkedGame, onDelete }, ref) {
    const gameDate = new Date(game.date);
    const isPastGame = isPast(gameDate) && !isToday(gameDate);
    const isTodayGame = isToday(gameDate);

    const content = (
      <div
        ref={ref}
        className={cn(
          'stat-card group relative hover:border-primary/50 cursor-pointer transition-colors',
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
            {linkedGame && (
              <div
                className={cn(
                  'px-2 py-1 rounded text-xs font-bold uppercase',
                  linkedGame.isWin
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {linkedGame.isWin ? 'W' : 'L'} - {linkedGame.points} pts
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(game.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {linkedGame && (
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>

        <h3 className="font-semibold text-lg mb-2">vs {game.opponent}</h3>

        {game.tournament && (
          <div className="flex items-center gap-1.5 mb-2 text-sm text-primary font-medium">
            <Trophy className="w-4 h-4" />
            <span>{game.tournament}</span>
          </div>
        )}

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

    // Always link - to recorded game if available, otherwise to scheduled game
    const linkTo = linkedGame 
      ? `/game/${linkedGame.id}` 
      : `/game/scheduled/${game.id}`;
    
    return <Link to={linkTo}>{content}</Link>;
  }
);
