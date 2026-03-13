import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ScheduledGame, GameStats } from '@/types/basketball';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Home, Plane, ChevronRight as ViewIcon, Plus, Pencil, Trophy, Users } from 'lucide-react';
import { QuickAddScheduleDialog } from './QuickAddScheduleDialog';
import { EditScheduleDialog } from './EditScheduleDialog';
import { ImportScheduleDialog } from './ImportScheduleDialog';
import { Sparkles } from 'lucide-react';

interface ScheduleCalendarProps {
  games: ScheduledGame[];
  playedGames?: GameStats[];
  onSelectGame?: (game: ScheduledGame) => void;
  onAddGame?: (game: Omit<ScheduledGame, 'id'>) => Promise<any> | any;
  onUpdateGame?: (id: string, updates: Partial<Omit<ScheduledGame, 'id'>>) => Promise<any> | any;
  onBulkAddGames?: (games: Omit<ScheduledGame, 'id'>[]) => Promise<any> | any;
}

export function ScheduleCalendar({ games, playedGames = [], onSelectGame, onAddGame, onUpdateGame, onBulkAddGames }: ScheduleCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  // Get games for a specific date
  const getGamesForDate = (date: Date) => {
    return games.filter((game) => isSameDay(new Date(game.date), date));
  };

  // Find a linked played game by matching opponent and approximate date
  const findLinkedGame = (scheduledGame: ScheduledGame): GameStats | undefined => {
    const scheduleDate = new Date(scheduledGame.date);
    return playedGames.find((pg) => {
      const playedDate = new Date(pg.date);
      return (
        pg.opponent.toLowerCase() === scheduledGame.opponent.toLowerCase() &&
        isSameDay(scheduleDate, playedDate)
      );
    });
  };

  const handleGameClick = (game: ScheduledGame) => {
    const linkedGame = findLinkedGame(game);
    if (linkedGame) {
      navigate(`/game/${linkedGame.id}`);
    } else {
      navigate(`/game/scheduled/${game.id}`);
    }
  };

  const handleDayClick = (day: Date) => {
    const dayGames = getGamesForDate(day);
    if (dayGames.length > 0) {
      // Toggle selection - if same date clicked, close it
      if (selectedDate && isSameDay(selectedDate, day)) {
        setSelectedDate(null);
      } else {
        setSelectedDate(day);
      }
    } else {
      setSelectedDate(null);
    }
  };

  const handleQuickAdd = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickAddDate(day);
  };

  // Custom day content with game markers and add button
  const renderDay = (day: Date) => {
    const dayGames = getGamesForDate(day);
    const hasGames = dayGames.length > 0;
    const isSelected = selectedDate && isSameDay(selectedDate, day);

    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleDayClick(day);
        }}
        className={cn(
          "w-full h-full flex flex-col items-center justify-center relative rounded-md transition-colors group/day",
          hasGames && "cursor-pointer",
          isSelected && hasGames && "bg-primary text-primary-foreground"
        )}
      >
        <span>{format(day, 'd')}</span>
        {hasGames && (
          <div className="flex gap-0.5 mt-0.5">
            {dayGames.slice(0, 3).map((game) => (
              <div
                key={game.id}
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isSelected ? 'bg-primary-foreground' : (game.isHome ? 'bg-green-500' : 'bg-blue-500')
                )}
              />
            ))}
          </div>
        )}
        {/* Quick Add Button - shows on hover */}
        {onAddGame && (
          <button
            onClick={(e) => handleQuickAdd(day, e)}
            className={cn(
              "absolute top-0 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground",
              "flex items-center justify-center text-xs font-bold",
              "opacity-0 group-hover/day:opacity-100 transition-opacity",
              "hover:bg-primary/80"
            )}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </button>
    );
  };

  const selectedGames = selectedDate ? getGamesForDate(selectedDate) : [];

  return (
    <div className="stat-card">
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        showOutsideDays
        className="p-3 pointer-events-auto w-full"
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-4 w-full",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-lg font-semibold",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex w-full",
          head_cell:
            "text-muted-foreground rounded-md flex-1 font-medium text-sm py-2 text-center",
          row: "flex w-full mt-1",
          cell: cn(
            "flex-1 aspect-square text-center text-sm p-0.5 relative",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            "h-full w-full p-0 font-normal rounded-md hover:bg-accent transition-colors flex items-center justify-center"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside: "day-outside text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-5 w-5" />,
          IconRight: () => <ChevronRight className="h-5 w-5" />,
          DayContent: ({ date }) => renderDay(date),
        }}
      />

      {/* Selected Date Game Details */}
      {selectedDate && selectedGames.length > 0 && (
        <div className="border-t border-border mt-4 pt-4 space-y-3 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground px-2">
            {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {selectedGames.map((game) => {
            const linkedGame = findLinkedGame(game);
            return (
              <div
                key={game.id}
                className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors border border-border/50 hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1',
                        game.isHome
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      )}
                    >
                      {game.isHome ? (
                        <>
                          <Home className="w-3 h-3" /> Home
                        </>
                      ) : (
                        <>
                          <Plane className="w-3 h-3" /> Away
                        </>
                      )}
                    </div>
                    <span className="text-base font-semibold">vs {game.opponent}</span>
                    {game.teamName && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {game.teamName}
                      </Badge>
                    )}
                    {game.tournament && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {game.tournament}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {linkedGame && (
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded',
                          linkedGame.isWin
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {linkedGame.isWin ? 'W' : 'L'} - {linkedGame.points} pts
                      </span>
                    )}
                    {onUpdateGame && !linkedGame && (
                      <EditScheduleDialog
                        game={game}
                        onUpdate={onUpdateGame}
                        onAddGame={onAddGame}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {game.time} • {game.location}
                    </p>
                    <button 
                      onClick={() => handleGameClick(game)}
                      className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
                    >
                      View Details <ViewIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend & AI Import */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Home</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Away</span>
          </div>
        </div>
        {onBulkAddGames && (
          <AIScheduleImportDialog
            onImport={onBulkAddGames}
            existingGames={games}
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                AI Import
              </Button>
            }
          />
        )}
      </div>

      {/* Quick Add Dialog */}
      {quickAddDate && onAddGame && (
        <QuickAddScheduleDialog
          date={quickAddDate}
          open={!!quickAddDate}
          onOpenChange={(open) => !open && setQuickAddDate(null)}
          onAddGame={onAddGame}
        />
      )}
    </div>
  );
}
