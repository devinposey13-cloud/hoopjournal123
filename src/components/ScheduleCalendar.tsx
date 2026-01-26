import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ScheduledGame } from '@/types/basketball';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, Plane } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ScheduleCalendarProps {
  games: ScheduledGame[];
  onSelectGame?: (game: ScheduledGame) => void;
}

export function ScheduleCalendar({ games, onSelectGame }: ScheduleCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());

  // Get games for a specific date
  const getGamesForDate = (date: Date) => {
    return games.filter((game) => isSameDay(new Date(game.date), date));
  };

  // Custom day content with game markers
  const renderDay = (day: Date) => {
    const dayGames = getGamesForDate(day);
    const hasGames = dayGames.length > 0;

    if (!hasGames) {
      return <span>{format(day, 'd')}</span>;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full h-full flex flex-col items-center justify-center relative">
            <span>{format(day, 'd')}</span>
            <div className="flex gap-0.5 mt-0.5">
              {dayGames.slice(0, 3).map((game, idx) => (
                <div
                  key={game.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    game.isHome ? 'bg-green-500' : 'bg-blue-500'
                  )}
                />
              ))}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 bg-popover border-border z-50" align="center">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-1">
              {format(day, 'EEEE, MMMM d')}
            </p>
            {dayGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame?.(game)}
                className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1',
                      game.isHome
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    )}
                  >
                    {game.isHome ? (
                      <>
                        <Home className="w-2.5 h-2.5" /> H
                      </>
                    ) : (
                      <>
                        <Plane className="w-2.5 h-2.5" /> A
                      </>
                    )}
                  </div>
                  <span className="text-sm font-medium">vs {game.opponent}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {game.time} • {game.location}
                </p>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Get all dates that have games for modifiers
  const gameDates = games.map((game) => new Date(game.date));

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
            "[&:has([aria-selected])]:bg-accent",
            "first:[&:has([aria-selected])]:rounded-l-md",
            "last:[&:has([aria-selected])]:rounded-r-md",
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
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>Home</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Away</span>
        </div>
      </div>
    </div>
  );
}
