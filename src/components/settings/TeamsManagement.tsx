import { useState } from 'react';
import { usePlayerTeams, PlayerTeam } from '@/hooks/usePlayerTeams';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TeamsManagement() {
  const { teams, loading, addTeam, deleteTeam, setPrimaryTeam } = usePlayerTeams();
  const [newTeamName, setNewTeamName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    
    setIsAdding(true);
    await addTeam(newTeamName.trim());
    setNewTeamName('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTeam();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">My Teams</Label>
          <p className="text-xs text-muted-foreground">
            Add all teams you play for (school, travel, AAU, etc.)
          </p>
        </div>
      </div>

      {/* Team List */}
      {teams.length > 0 && (
        <div className="space-y-2">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              onSetPrimary={() => setPrimaryTeam(team.id)}
              onDelete={() => deleteTeam(team.id)}
              canDelete={teams.length > 1}
            />
          ))}
        </div>
      )}

      {/* Add New Team */}
      <div className="flex gap-2">
        <Input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new team..."
          className="flex-1"
          maxLength={50}
        />
        <Button
          onClick={handleAddTeam}
          disabled={!newTeamName.trim() || isAdding}
          size="icon"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

interface TeamRowProps {
  team: PlayerTeam;
  onSetPrimary: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function TeamRow({ team, onSetPrimary, onDelete, canDelete }: TeamRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      team.is_primary ? "bg-primary/5 border-primary/20" : "bg-muted/30"
    )}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{team.name}</span>
        {team.is_primary && (
          <Badge variant="secondary" className="text-xs">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Default
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!team.is_primary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSetPrimary}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Set as default
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
