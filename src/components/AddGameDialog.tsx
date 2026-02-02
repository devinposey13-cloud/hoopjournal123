import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GameStats } from '@/types/basketball';
import { GameStatsForm } from './GameStatsForm';

interface AddGameDialogProps {
  onAddGame: (game: Omit<GameStats, 'id'>) => Promise<any> | any;
  isMobile?: boolean;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
}

export function AddGameDialog({ onAddGame, isMobile, autoOpen, onAutoOpenConsumed }: AddGameDialogProps) {
  const [open, setOpen] = useState(false);

  // Handle auto-open from external trigger (e.g., onboarding completion)
  useEffect(() => {
    if (autoOpen && !open) {
      setOpen(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpen, open, onAutoOpenConsumed]);

  const handleSubmit = async (gameData: Omit<GameStats, 'id'>) => {
    await onAddGame(gameData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Log New Game</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <GameStatsForm onSubmit={handleSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
