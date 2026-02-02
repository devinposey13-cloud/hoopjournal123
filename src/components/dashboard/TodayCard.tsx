import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { Calendar, Radio, MessageSquare, Flame, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScheduledGame, GameStats } from '@/types/basketball';
import { cn } from '@/lib/utils';

interface TodayCardProps {
  schedule: ScheduledGame[];
  games: GameStats[];
  currentStreak: number;
  xpLevel?: number;
  onLogGame: () => void;
  onOpenCoach: () => void;
  onStartLiveCapture?: () => void;
}

export function TodayCard({
  schedule,
  games,
  currentStreak,
  xpLevel,
  onLogGame,
  onOpenCoach,
  onStartLiveCapture,
}: TodayCardProps) {
  // Find next upcoming game
  const now = new Date();
  const upcomingGames = schedule
    .filter(g => {
      const gameDate = new Date(g.date);
      return gameDate >= new Date(now.toDateString());
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const nextGame = upcomingGames[0];
  const todayGame = upcomingGames.find(g => isToday(new Date(g.date)));
  const tomorrowGame = !todayGame ? upcomingGames.find(g => isTomorrow(new Date(g.date))) : null;

  // Calculate time until game
  const getTimeLabel = () => {
    if (todayGame) {
      const gameDateTime = new Date(`${todayGame.date}T${todayGame.time}`);
      const hoursUntil = differenceInHours(gameDateTime, now);
      if (hoursUntil <= 0) return 'Game time!';
      if (hoursUntil === 1) return 'In 1 hour';
      if (hoursUntil < 6) return `In ${hoursUntil} hours`;
      return `Today at ${todayGame.time}`;
    }
    if (tomorrowGame) return 'Tomorrow';
    if (nextGame) return format(new Date(nextGame.date), 'EEE, MMM d');
    return null;
  };

  const displayGame = todayGame || tomorrowGame || nextGame;
  const timeLabel = getTimeLabel();
  const isGameDay = Boolean(todayGame);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6",
      "bg-gradient-to-br from-primary/10 via-background to-accent/5",
      "border border-border/50",
      isGameDay && "ring-2 ring-primary/30"
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Up Next</h2>
            {isGameDay && (
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                Game Day
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Your next game</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{currentStreak}</span>
            </div>
          )}
          {xpLevel && (
            <Badge variant="outline" className="text-xs">
              Lv.{xpLevel}
            </Badge>
          )}
        </div>
      </div>

      {/* Next Game Info */}
      {displayGame ? (
        <div className="mb-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{timeLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">
                {displayGame.isHome ? 'vs' : '@'} {displayGame.opponent}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {displayGame.time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {displayGame.time}
                  </span>
                )}
                {displayGame.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {displayGame.location.length > 20 
                      ? displayGame.location.substring(0, 20) + '...' 
                      : displayGame.location}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-muted-foreground font-medium">No upcoming games scheduled</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add your next game to keep your season up to date.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {isGameDay && onStartLiveCapture ? (
          <Button 
            onClick={onStartLiveCapture}
            className="flex-1 gap-2"
            size="lg"
          >
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Live Stats</span>
            <span className="sm:hidden">Live</span>
          </Button>
        ) : (
          <Button 
            onClick={onLogGame}
            className="flex-1 gap-2"
            size="lg"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Log Game</span>
            <span className="sm:hidden">Log</span>
          </Button>
        )}
        <Button 
          onClick={onOpenCoach}
          variant="outline"
          className="flex-1 gap-2"
          size="lg"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Coach</span>
          <span className="sm:hidden">Coach</span>
        </Button>
      </div>
    </div>
  );
}
