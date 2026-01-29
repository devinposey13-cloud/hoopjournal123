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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Plus, Calendar, Check, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeason: Season | null;
  onSeasonChange: (seasonId: string) => void;
  onCreateSeason: (name: string) => Promise<void>;
  onDeleteSeason?: (seasonId: string) => Promise<boolean>;
}

export function SeasonSelector({
  seasons,
  activeSeason,
  onSeasonChange,
  onCreateSeason,
  onDeleteSeason,
}: SeasonSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!seasonToDelete || !onDeleteSeason) return;
    
    setIsDeleting(true);
    try {
      await onDeleteSeason(seasonToDelete.id);
      setSeasonToDelete(null);
    } finally {
      setIsDeleting(false);
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
    <>
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
          <DropdownMenuContent align="end" className="w-64">
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
                    'cursor-pointer flex items-center justify-between group',
                    season.id === activeSeason?.id && 'bg-primary/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {season.id === activeSeason?.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                    <span className={season.id !== activeSeason?.id ? 'ml-6' : ''}>
                      {season.name}
                    </span>
                  </div>
                  {onDeleteSeason && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSeasonToDelete(season);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
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
                  <DialogDescription>
                    Create a new season to track your games, stats, and clips separately.
                  </DialogDescription>
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
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={!newSeasonName.trim() || isCreating}
                      className="w-full sm:w-auto"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Season'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!seasonToDelete} onOpenChange={(open) => !open && setSeasonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>"{seasonToDelete?.name}"</strong>?
              </p>
              <p className="text-destructive font-medium">
                This will permanently delete all games, scheduled games, video clips, and milestones associated with this season.
              </p>
              <p>This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Season
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
