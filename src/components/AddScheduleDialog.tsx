import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScheduledGame } from '@/types/basketball';

interface MultiGameEntry {
  id: string;
  date: Date;
  time: string;
  opponent: string;
}

interface AddScheduleDialogProps {
  onAddGame: (game: Omit<ScheduledGame, 'id'>) => Promise<any> | any;
  onBulkAddGames?: (games: Omit<ScheduledGame, 'id'>[]) => Promise<any> | any;
  isMobile?: boolean;
}

export function AddScheduleDialog({ onAddGame, onBulkAddGames, isMobile }: AddScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [multiMode, setMultiMode] = useState(false);
  const [formData, setFormData] = useState({
    time: '18:00',
    opponent: '',
    location: '',
    isHome: true,
    notes: '',
    tournament: '',
  });
  
  // Multi-game entries
  const [multiGames, setMultiGames] = useState<MultiGameEntry[]>([
    { id: crypto.randomUUID(), date: new Date(), time: '18:00', opponent: '' }
  ]);

  const resetForm = () => {
    setFormData({
      time: '18:00',
      opponent: '',
      location: '',
      isHome: true,
      notes: '',
      tournament: '',
    });
    setDate(new Date());
    setMultiMode(false);
    setMultiGames([{ id: crypto.randomUUID(), date: new Date(), time: '18:00', opponent: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (multiMode && onBulkAddGames) {
      // Submit all games at once
      const validGames = multiGames.filter(g => g.opponent.trim());
      if (validGames.length === 0) return;
      
      const gamesToAdd = validGames.map(g => ({
        date: g.date.toISOString(),
        time: g.time,
        opponent: g.opponent,
        location: formData.location,
        isHome: formData.isHome,
        notes: '',
        // Auto-fill tag with opponent if not provided
        tournament: formData.tournament || g.opponent,
      }));
      
      await onBulkAddGames(gamesToAdd);
    } else {
      // Single game - auto-fill tag with opponent if not provided
      await onAddGame({
        ...formData,
        tournament: formData.tournament || formData.opponent,
        date: date.toISOString(),
      });
    }
    
    setOpen(false);
    resetForm();
  };

  const addMultiGameRow = () => {
    const lastGame = multiGames[multiGames.length - 1];
    const nextDate = new Date(lastGame?.date || new Date());
    nextDate.setDate(nextDate.getDate() + 1);
    
    setMultiGames([
      ...multiGames,
      { id: crypto.randomUUID(), date: nextDate, time: '18:00', opponent: '' }
    ]);
  };

  const removeMultiGameRow = (id: string) => {
    if (multiGames.length > 1) {
      setMultiGames(multiGames.filter(g => g.id !== id));
    }
  };

  const updateMultiGame = (id: string, updates: Partial<MultiGameEntry>) => {
    setMultiGames(multiGames.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button 
          className="gradient-primary font-semibold"
          size={isMobile ? "icon" : "default"}
          title="Add Game"
        >
          <Plus className="w-4 h-4" />
          {!isMobile && <span className="ml-2">Add Game</span>}
          {isMobile && <span className="sr-only">Add Game</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Schedule New Game</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tournament">Tag (optional)</Label>
            <Input
              id="tournament"
              value={formData.tournament}
              onChange={(e) => setFormData({ ...formData, tournament: e.target.value })}
              placeholder="e.g., Winter Classic 2026"
            />
            <p className="text-xs text-muted-foreground">Leave blank to use opponent name as tag</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Gym or arena name"
              required
            />
          </div>

          {/* Home/Away Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.isHome}
              onCheckedChange={(checked) => setFormData({ ...formData, isHome: checked })}
            />
            <Label>{formData.isHome ? 'Home Game' : 'Away Game'}</Label>
          </div>

          {/* Multi-game toggle - only show if tag is entered */}
          {formData.tournament && onBulkAddGames && (
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
              <Switch
                checked={multiMode}
                onCheckedChange={setMultiMode}
              />
              <div>
                <Label className="font-medium">Add Multiple Games</Label>
                <p className="text-xs text-muted-foreground">Add several games at once with shared tag info</p>
              </div>
            </div>
          )}

          {!multiMode ? (
            <>
              {/* Single Game Mode */}
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'MMM d, yyyy') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Opponent */}
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent</Label>
                <Input
                  id="opponent"
                  value={formData.opponent}
                  onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                  placeholder="Team name"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional info..."
                  rows={2}
                />
              </div>
            </>
          ) : (
            <>
              {/* Multi-Game Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Games</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMultiGameRow}>
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {multiGames.map((game, index) => (
                    <div key={game.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                      <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-28 justify-start text-left font-normal text-xs"
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {format(game.date, 'MMM d')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                          <Calendar
                            mode="single"
                            selected={game.date}
                            onSelect={(d) => d && updateMultiGame(game.id, { date: d })}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Input
                        type="time"
                        value={game.time}
                        onChange={(e) => updateMultiGame(game.id, { time: e.target.value })}
                        className="w-24 text-xs"
                      />
                      
                      <Input
                        value={game.opponent}
                        onChange={(e) => updateMultiGame(game.id, { opponent: e.target.value })}
                        placeholder="Opponent"
                        className="flex-1 text-xs"
                      />
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMultiGameRow(game.id)}
                        disabled={multiGames.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full gradient-primary font-semibold">
            {multiMode 
              ? `Add ${multiGames.filter(g => g.opponent.trim()).length} Games to Schedule`
              : 'Add to Schedule'
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
