import { useState } from 'react';
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
}

export function AddGameDialog({ onAddGame }: AddGameDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (gameData: Omit<GameStats, 'id'>) => {
    await onAddGame(gameData);
    setOpen(false);
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
        <div className="mt-4">
          <GameStatsForm onSubmit={handleSubmit} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
