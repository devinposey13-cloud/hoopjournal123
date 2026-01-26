import { useState } from 'react';
import { Season } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Plus, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
}

export function SeasonSelector({
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
}: SeasonSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newSeasonName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateSeason(newSeasonName.trim());
      setNewSeasonName('');
      setIsCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  // Generate season name suggestion based on current date
  const getSuggestedSeasonName = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    // Winter: Nov-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Oct
    if (month >= 10 || month <= 1) {
      return `Winter ${year}-${year + 1}`;
    } else if (month >= 2 && month <= 4) {
      return `Spring ${year}`;
    } else if (month >= 5 && month <= 7) {
      return `Summer ${year}`;
    } else {
      return `Fall ${year}`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">
              {activeSeason?.name || 'Select Season'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {seasons.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No seasons yet
            </div>
          ) : (
            seasons.map((season) => (
              <DropdownMenuItem
                key={season.id}
                onClick={() => onSeasonChange(season.id)}
                className={cn(
                  'cursor-pointer',
                  season.id === activeSeason?.id && 'bg-primary/10'
                )}
              >
                <span className="flex-1">{season.name}</span>
                {season.id === activeSeason?.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setNewSeasonName(getSuggestedSeasonName());
                  setIsCreateDialogOpen(true);
                }}
                className="cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Season
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="season-name">Season Name</Label>
                  <Input
                    id="season-name"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    placeholder="e.g., Winter 2025-2026"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreate();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newSeasonName.trim() || isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Creating...' : 'Create Season'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
