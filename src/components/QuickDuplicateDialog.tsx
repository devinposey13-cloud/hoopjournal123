import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Copy, Plus, Trash2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScheduledGame } from '@/types/basketball';
import { toast } from 'sonner';

interface DuplicateGameEntry {
  id: string;
  date: Date;
  time: string;
  opponent: string;
}

interface QuickDuplicateDialogProps {
  sourceGame: ScheduledGame;
  onDuplicate: (games: Omit<ScheduledGame, 'id'>[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export function QuickDuplicateDialog({ sourceGame, onDuplicate, trigger }: QuickDuplicateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<DuplicateGameEntry[]>([
    {
      id: crypto.randomUUID(),
      date: addDays(new Date(sourceGame.date), 1),
      time: sourceGame.time,
      opponent: '',
    },
  ]);

  const addEntry = () => {
    const lastEntry = entries[entries.length - 1];
    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        date: addDays(lastEntry?.date || new Date(), 1),
        time: sourceGame.time,
        opponent: '',
      },
    ]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const updateEntry = (id: string, updates: Partial<DuplicateGameEntry>) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all entries have opponents
    const emptyOpponents = entries.filter((e) => !e.opponent.trim());
    if (emptyOpponents.length > 0) {
      toast.error('Please enter an opponent for each game');
      return;
    }

    setIsSubmitting(true);
    try {
      const gamesToCreate: Omit<ScheduledGame, 'id'>[] = entries.map((entry) => ({
        date: entry.date.toISOString(),
        time: entry.time,
        opponent: entry.opponent.trim(),
        location: sourceGame.location,
        isHome: sourceGame.isHome,
        notes: '',
        tournament: sourceGame.tournament,
      }));

      await onDuplicate(gamesToCreate);
      toast.success(`Created ${entries.length} game${entries.length > 1 ? 's' : ''} successfully!`);
      setOpen(false);
      
      // Reset entries for next use
      setEntries([
        {
          id: crypto.randomUUID(),
          date: addDays(new Date(sourceGame.date), 1),
          time: sourceGame.time,
          opponent: '',
        },
      ]);
    } catch (error) {
      console.error('Error duplicating games:', error);
      toast.error('Failed to create games');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Quick Duplicate Game</DialogTitle>
        </DialogHeader>

        {/* Source Info Banner */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Creating duplicates with the same:
          </p>
          <div className="flex flex-wrap gap-2">
            {sourceGame.tournament && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                <Trophy className="w-3 h-3" />
                {sourceGame.tournament}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
              📍 {sourceGame.location}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
              {sourceGame.isHome ? '🏠 Home' : '✈️ Away'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-3">
            <Label className="text-base font-medium">Games to Create</Label>
            
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end p-3 bg-muted/30 rounded-lg border border-border"
              >
                {/* Date Picker */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-left font-normal h-9',
                          !entry.date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(entry.date, 'MMM d')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={entry.date}
                        onSelect={(d) => d && updateEntry(entry.id, { date: d })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={entry.time}
                    onChange={(e) => updateEntry(entry.id, { time: e.target.value })}
                    className="h-9 w-24"
                    required
                  />
                </div>

                {/* Opponent */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Opponent</Label>
                  <Input
                    value={entry.opponent}
                    onChange={(e) => updateEntry(entry.id, { opponent: e.target.value })}
                    placeholder="Team name"
                    className="h-9"
                    required
                  />
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(entry.id)}
                  disabled={entries.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* Add Another Row */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addEntry}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Day
            </Button>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full gradient-primary font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating...'
              : `Create ${entries.length} Game${entries.length > 1 ? 's' : ''}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
