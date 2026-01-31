import { useState, useEffect } from 'react';
import { Radio, Play, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ScheduledGame, PlayerTeam } from '@/types/basketball';

interface QuickLiveStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayGames: ScheduledGame[];
  teams?: PlayerTeam[];
  onStartCapture: (opponent: string, scheduledGameId?: string, teamId?: string) => void;
}

export function QuickLiveStatsDialog({
  open,
  onOpenChange,
  todayGames,
  teams = [],
  onStartCapture,
}: QuickLiveStatsDialogProps) {
  const [manualOpponent, setManualOpponent] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState(todayGames.length === 0);

  // Set default team to primary team when dialog opens
  useEffect(() => {
    if (open && teams.length > 0) {
      const primaryTeam = teams.find(t => t.is_primary);
      setSelectedTeamId(primaryTeam?.id || teams[0]?.id || '');
    }
  }, [open, teams]);

  const handleStartWithGame = (game: ScheduledGame) => {
    // Use the game's team if available, otherwise use selected team
    const teamId = game.teamId || selectedTeamId || undefined;
    onStartCapture(game.opponent, game.id, teamId);
    onOpenChange(false);
  };

  const handleStartManual = () => {
    if (manualOpponent.trim()) {
      onStartCapture(manualOpponent.trim(), undefined, selectedTeamId || undefined);
      onOpenChange(false);
      setManualOpponent('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setManualOpponent('');
      setShowManualEntry(todayGames.length === 0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Quick Live Stats
          </DialogTitle>
          <DialogDescription>
            {todayGames.length > 0
              ? 'Select a game to start tracking or enter an opponent manually.'
              : 'Enter your opponent to start tracking stats.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Team selector - show when teams exist */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="team" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Playing for
              </Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} {team.is_primary && '(Primary)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Today's scheduled games */}
          {todayGames.length > 0 && !showManualEntry && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Today's Games</Label>
              {todayGames.map((game) => (
                <Button
                  key={game.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => handleStartWithGame(game)}
                >
                  <div className="text-left">
                    <p className="font-semibold">
                      {game.isHome ? 'vs' : '@'} {game.opponent}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game.time} • {game.location}
                      {game.teamName && ` • ${game.teamName}`}
                    </p>
                  </div>
                  <Play className="w-4 h-4 text-primary" />
                </Button>
              ))}
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowManualEntry(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Enter opponent manually
              </Button>
            </div>
          )}

          {/* Manual opponent entry */}
          {(todayGames.length === 0 || showManualEntry) && (
            <div className="space-y-4">
              {todayGames.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowManualEntry(false)}
                >
                  ← Back to today's games
                </Button>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent Name</Label>
                <Input
                  id="opponent"
                  placeholder="e.g., Central High"
                  value={manualOpponent}
                  onChange={(e) => setManualOpponent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartManual();
                  }}
                  autoFocus
                />
              </div>
              
              <Button
                className="w-full gradient-primary"
                onClick={handleStartManual}
                disabled={!manualOpponent.trim()}
              >
                <Radio className="w-4 h-4 mr-2" />
                Start Tracking
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}