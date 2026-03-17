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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameStats } from '@/types/basketball';
import { GameStatsForm } from './GameStatsForm';
import { AIStatsCapture } from './AIStatsCapture';
import { usePlan } from '@/hooks/usePlanState';

interface AddGameDialogProps {
  onAddGame: (game: Omit<GameStats, 'id'>) => Promise<any> | any;
  isMobile?: boolean;
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
  prefill?: {
    date?: Date;
    opponent?: string;
    teamId?: string;
    scheduledGameId?: string;
  };
  /** Custom trigger element. If provided, replaces the default button. */
  customTrigger?: React.ReactNode;
}

export function AddGameDialog({ onAddGame, isMobile, autoOpen, onAutoOpenConsumed, prefill, customTrigger }: AddGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');
  const { canLogGame, openPaywall } = usePlan();

  // Handle auto-open from external trigger (e.g., onboarding completion)
  useEffect(() => {
    if (autoOpen && !open) {
      if (!canLogGame()) {
        openPaywall('game_limit');
        onAutoOpenConsumed?.();
        return;
      }
      setOpen(true);
      onAutoOpenConsumed?.();
    }
  }, [autoOpen, open, onAutoOpenConsumed, canLogGame, openPaywall]);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !canLogGame()) {
      openPaywall('game_limit');
      return;
    }
    setOpen(newOpen);
  };

  const handleSubmit = async (gameData: Omit<GameStats, 'id'>) => {
    const enriched = prefill?.scheduledGameId 
      ? { ...gameData, scheduledGameId: prefill.scheduledGameId } 
      : gameData;
    await onAddGame(enriched);
    setOpen(false);
  };

  const initialData = prefill ? {
    date: prefill.date,
    opponent: prefill.opponent,
    teamId: prefill.teamId,
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {customTrigger || (
          <Button 
            className="gradient-primary font-semibold"
            size={isMobile ? "icon" : "default"}
            title="Add Game"
          >
            <Plus className="w-4 h-4" />
            {!isMobile && <span className="ml-2">Add Game</span>}
            {isMobile && <span className="sr-only">Add Game</span>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Log New Game</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'ai')} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-1.5">
              <span className="text-base">✨</span> AI Capture
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="mt-4">
            <AIStatsCapture onSubmit={handleSubmit} />
          </TabsContent>
          
          <TabsContent value="manual" className="mt-4">
            <GameStatsForm onSubmit={handleSubmit} initialData={initialData} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
