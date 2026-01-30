import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Pencil, Copy } from 'lucide-react';
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
  onAddGame?: (game: Omit<ScheduledGame, 'id'>) => Promise<any> | any;
  trigger?: React.ReactNode;
}

export function EditScheduleDialog({ game, onUpdate, onAddGame, trigger }: EditScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date(game.date));
  const [formData, setFormData] = useState({
    time: game.time,
    opponent: game.opponent,
    location: game.location,
    isHome: game.isHome,
    notes: game.notes || '',
    tournament: game.tournament || '',
  });
  const [showDuplicateForm, setShowDuplicateForm] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState<Date>(new Date());
  const [duplicateData, setDuplicateData] = useState({
    time: '18:00',
    opponent: '',
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
        tournament: game.tournament || '',
      });
      setShowDuplicateForm(false);
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

  const handleDuplicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddGame) return;
    
    await onAddGame({
      date: duplicateDate.toISOString(),
      time: duplicateData.time,
      opponent: duplicateData.opponent,
      location: formData.location,
      isHome: formData.isHome,
      notes: '',
      tournament: formData.tournament,
    });
    
    // Reset duplicate form for another entry
    setDuplicateData({
      time: '18:00',
      opponent: '',
    });
    setDuplicateDate(new Date(duplicateDate.getTime() + 86400000)); // Next day
  };

  const handleCloseDuplicate = () => {
    setShowDuplicateForm(false);
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
      <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {showDuplicateForm ? 'Add Another Tagged Game' : 'Edit Game Details'}
          </DialogTitle>
        </DialogHeader>
        
        {!showDuplicateForm ? (
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
            </div>

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

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full gradient-primary font-semibold">
                Save Changes
              </Button>
              
              {/* Duplicate button - only show when tag is set and onAddGame is provided */}
              {formData.tournament && onAddGame && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowDuplicateForm(true)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Add Another Game with "{formData.tournament}" tag
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleDuplicateSubmit} className="space-y-4 mt-4">
            {/* Tag Badge */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">Tag: {formData.tournament}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Location: {formData.location} • {formData.isHome ? 'Home' : 'Away'}
              </p>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !duplicateDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {duplicateDate ? format(duplicateDate, 'MMM d, yyyy') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={duplicateDate}
                    onSelect={(d) => d && setDuplicateDate(d)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-time">Time</Label>
              <Input
                id="duplicate-time"
                type="time"
                value={duplicateData.time}
                onChange={(e) => setDuplicateData({ ...duplicateData, time: e.target.value })}
                required
              />
            </div>

            {/* Opponent */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-opponent">Opponent</Label>
              <Input
                id="duplicate-opponent"
                value={duplicateData.opponent}
                onChange={(e) => setDuplicateData({ ...duplicateData, opponent: e.target.value })}
                placeholder="Team name"
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gradient-primary font-semibold">
                Add Game
              </Button>
              <Button type="button" variant="outline" onClick={handleCloseDuplicate}>
                Done
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
