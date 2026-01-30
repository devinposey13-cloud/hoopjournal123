import { useState } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScheduledGame } from '@/types/basketball';

interface QuickAddScheduleDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddGame: (game: Omit<ScheduledGame, 'id'>) => Promise<any> | any;
}

export function QuickAddScheduleDialog({ 
  date, 
  open, 
  onOpenChange, 
  onAddGame 
}: QuickAddScheduleDialogProps) {
  const [formData, setFormData] = useState({
    time: '18:00',
    opponent: '',
    location: '',
    isHome: true,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddGame({
      ...formData,
      date: date.toISOString(),
    });
    onOpenChange(false);
    // Reset form
    setFormData({
      time: '18:00',
      opponent: '',
      location: '',
      isHome: true,
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Add Game on {format(date, 'MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Time */}
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

          {/* Opponent */}
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent</Label>
            <Input
              id="opponent"
              value={formData.opponent}
              onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
              placeholder="Team name"
              required
              autoFocus
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

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Game
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
