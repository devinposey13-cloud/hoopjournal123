import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { GameStats } from '@/types/basketball';

interface AddGameDialogProps {
  onAddGame: (game: Omit<GameStats, 'id'>) => void;
}

export function AddGameDialog({ onAddGame }: AddGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    opponent: '',
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    minutesPlayed: 0,
    fgMade: 0,
    fgAttempted: 0,
    threePtMade: 0,
    threePtAttempted: 0,
    ftMade: 0,
    ftAttempted: 0,
    isWin: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddGame({
      ...formData,
      date: date.toISOString(),
    });
    setOpen(false);
    setFormData({
      opponent: '',
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      minutesPlayed: 0,
      fgMade: 0,
      fgAttempted: 0,
      threePtMade: 0,
      threePtAttempted: 0,
      ftMade: 0,
      ftAttempted: 0,
      isWin: true,
    });
  };

  const updateField = (field: string, value: number | string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Game
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Log New Game</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Date and Opponent */}
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
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={formData.opponent}
                onChange={(e) => updateField('opponent', e.target.value)}
                placeholder="Team name"
                required
              />
            </div>
          </div>

          {/* Win/Loss Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.isWin}
              onCheckedChange={(checked) => updateField('isWin', checked)}
            />
            <Label>{formData.isWin ? 'Win' : 'Loss'}</Label>
          </div>

          {/* Basic Stats */}
          <div>
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Basic Stats
            </Label>
            <div className="grid grid-cols-4 gap-3">
              <NumberInput
                label="Points"
                value={formData.points}
                onChange={(v) => updateField('points', v)}
              />
              <NumberInput
                label="Rebounds"
                value={formData.rebounds}
                onChange={(v) => updateField('rebounds', v)}
              />
              <NumberInput
                label="Assists"
                value={formData.assists}
                onChange={(v) => updateField('assists', v)}
              />
              <NumberInput
                label="Steals"
                value={formData.steals}
                onChange={(v) => updateField('steals', v)}
              />
              <NumberInput
                label="Blocks"
                value={formData.blocks}
                onChange={(v) => updateField('blocks', v)}
              />
              <NumberInput
                label="Turnovers"
                value={formData.turnovers}
                onChange={(v) => updateField('turnovers', v)}
              />
              <NumberInput
                label="Minutes"
                value={formData.minutesPlayed}
                onChange={(v) => updateField('minutesPlayed', v)}
              />
            </div>
          </div>

          {/* Shooting Stats */}
          <div>
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
              Shooting
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Field Goals</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.fgMade}
                    onChange={(e) => updateField('fgMade', parseInt(e.target.value) || 0)}
                    placeholder="Made"
                    className="text-center"
                  />
                  <span className="flex items-center text-muted-foreground">/</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.fgAttempted}
                    onChange={(e) => updateField('fgAttempted', parseInt(e.target.value) || 0)}
                    placeholder="Att"
                    className="text-center"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">3-Pointers</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.threePtMade}
                    onChange={(e) => updateField('threePtMade', parseInt(e.target.value) || 0)}
                    placeholder="Made"
                    className="text-center"
                  />
                  <span className="flex items-center text-muted-foreground">/</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.threePtAttempted}
                    onChange={(e) => updateField('threePtAttempted', parseInt(e.target.value) || 0)}
                    placeholder="Att"
                    className="text-center"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Free Throws</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={formData.ftMade}
                    onChange={(e) => updateField('ftMade', parseInt(e.target.value) || 0)}
                    placeholder="Made"
                    className="text-center"
                  />
                  <span className="flex items-center text-muted-foreground">/</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.ftAttempted}
                    onChange={(e) => updateField('ftAttempted', parseInt(e.target.value) || 0)}
                    placeholder="Att"
                    className="text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary font-semibold">
            Save Game
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="text-center"
      />
    </div>
  );
}
