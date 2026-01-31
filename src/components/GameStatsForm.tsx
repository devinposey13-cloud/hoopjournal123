import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { GameStats } from '@/types/basketball';
import { usePlayerTeams } from '@/hooks/usePlayerTeams';

interface GameStatsFormProps {
  onSubmit: (game: Omit<GameStats, 'id'>) => Promise<any> | any;
  initialData?: {
    date?: Date;
    opponent?: string;
    teamId?: string;
  };
  submitLabel?: string;
}

const defaultFormData = {
  opponent: '',
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fouls: 0,
  minutesPlayed: 0,
  fgMade: 0,
  fgAttempted: 0,
  threePtMade: 0,
  threePtAttempted: 0,
  ftMade: 0,
  ftAttempted: 0,
  isWin: true,
  teamId: '',
};

export function GameStatsForm({ onSubmit, initialData, submitLabel = 'Save Game' }: GameStatsFormProps) {
  const { teams, primaryTeam, loading: teamsLoading } = usePlayerTeams();
  const [date, setDate] = useState<Date>(initialData?.date || new Date());
  const [formData, setFormData] = useState({
    ...defaultFormData,
    opponent: initialData?.opponent || '',
    teamId: initialData?.teamId || '',
  });

  // Set default team when teams load
  useEffect(() => {
    if (!formData.teamId && primaryTeam) {
      setFormData(prev => ({ ...prev, teamId: primaryTeam.id }));
    }
  }, [primaryTeam, formData.teamId]);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || new Date());
      setFormData(prev => ({
        ...prev,
        opponent: initialData.opponent || '',
        teamId: initialData.teamId || prev.teamId,
      }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTeam = teams.find(t => t.id === formData.teamId);
    onSubmit({
      ...formData,
      date: date.toISOString(),
      teamName: selectedTeam?.name,
    });
  };

  const updateField = (field: string, value: number | string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Team Selection - Only show if user has multiple teams */}
      {teams.length > 1 && (
        <div className="space-y-2">
          <Label>Team</Label>
          <Select
            value={formData.teamId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                  {team.is_primary && " (Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Game Result
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={formData.isWin ? "default" : "outline"}
            className={cn(
              "flex-1 font-semibold transition-all",
              formData.isWin && "bg-green-600 hover:bg-green-700 text-white"
            )}
            onClick={() => updateField('isWin', true)}
          >
            🏆 Win
          </Button>
          <Button
            type="button"
            variant={!formData.isWin ? "default" : "outline"}
            className={cn(
              "flex-1 font-semibold transition-all",
              !formData.isWin && "bg-red-600 hover:bg-red-700 text-white"
            )}
            onClick={() => updateField('isWin', false)}
          >
            😤 Loss
          </Button>
        </div>
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
            label="Fouls (PF)"
            value={formData.fouls}
            onChange={(v) => updateField('fouls', v)}
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
        {submitLabel}
      </Button>
    </form>
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
