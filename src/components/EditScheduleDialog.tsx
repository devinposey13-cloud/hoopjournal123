import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Pencil } from 'lucide-react';
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

interface EditScheduleDialogProps {
  game: ScheduledGame;
  onUpdate: (id: string, updates: Partial<Omit<ScheduledGame, 'id'>>) => Promise<any> | any;
  trigger?: React.ReactNode;
}

export function EditScheduleDialog({ game, onUpdate, trigger }: EditScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date(game.date));
  const [formData, setFormData] = useState({
    time: game.time,
    opponent: game.opponent,
    location: game.location,
    isHome: game.isHome,
    notes: game.notes || '',
  });

  // Reset form when game changes or dialog opens
  useEffect(() => {
    if (open) {
      setDate(new Date(game.date));
      setFormData({
        time: game.time,
        opponent: game.opponent,
        location: game.location,
        isHome: game.isHome,
        notes: game.notes || '',
      });
    }
  }, [game, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(game.id, {
      ...formData,
      date: date.toISOString(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Game Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          <Button type="submit" className="w-full gradient-primary font-semibold">
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
