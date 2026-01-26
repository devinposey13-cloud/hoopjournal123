import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Rss, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseRSSSchedule, filterFutureGames } from '@/utils/rssParser';
import { ScheduledGame } from '@/types/basketball';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ImportScheduleDialogProps {
  onImport: (games: Omit<ScheduledGame, 'id'>[]) => Promise<ScheduledGame[] | void>;
}

interface ParsedGame {
  opponent: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  notes?: string;
  selected: boolean;
}

export function ImportScheduleDialog({ onImport }: ImportScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [rssContent, setRssContent] = useState('');
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [futureOnly, setFutureOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleParse = () => {
    if (!rssContent.trim()) {
      toast.error('Please paste the RSS feed content');
      return;
    }

    try {
      let games = parseRSSSchedule(rssContent);
      
      if (futureOnly) {
        games = filterFutureGames(games);
      }

      if (games.length === 0) {
        toast.error('No games found in the RSS feed');
        return;
      }

      setParsedGames(games.map((g) => ({ ...g, selected: true })));
      setStep('preview');
      toast.success(`Found ${games.length} games`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse RSS feed. Please check the format.');
    }
  };

  const toggleGame = (index: number) => {
    setParsedGames((prev) =>
      prev.map((g, i) => (i === index ? { ...g, selected: !g.selected } : g))
    );
  };

  const toggleAll = () => {
    const allSelected = parsedGames.every((g) => g.selected);
    setParsedGames((prev) => prev.map((g) => ({ ...g, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedGames = parsedGames.filter((g) => g.selected);
    
    if (selectedGames.length === 0) {
      toast.error('Please select at least one game to import');
      return;
    }

    setIsLoading(true);
    try {
      const gamesToImport = selectedGames.map(({ selected, ...game }) => game);
      await onImport(gamesToImport);
      toast.success(`Imported ${selectedGames.length} games to your schedule`);
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import games');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setRssContent('');
    setParsedGames([]);
    setStep('input');
  };

  const selectedCount = parsedGames.filter((g) => g.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Rss className="w-4 h-4 mr-2" />
          Import RSS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rss className="w-5 h-5" />
            Import Schedule from RSS
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Paste an RSS feed from your league website (WCAC, PrestoSports, etc.)'
              : `Select games to import (${selectedCount} of ${parsedGames.length} selected)`}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rss-content">RSS Feed Content</Label>
              <Textarea
                id="rss-content"
                placeholder="Paste the RSS XML content here..."
                value={rssContent}
                onChange={(e) => setRssContent(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Copy the RSS feed source from your league website and paste it here.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="future-only"
                  checked={futureOnly}
                  onCheckedChange={setFutureOnly}
                />
                <Label htmlFor="future-only" className="text-sm">
                  Import future games only
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleParse}>
                <Upload className="w-4 h-4 mr-2" />
                Parse Feed
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {parsedGames.every((g) => g.selected) ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedCount} games selected
              </span>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedGames.map((game, index) => (
                  <button
                    key={index}
                    onClick={() => toggleGame(index)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-colors',
                      game.selected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/50 border border-transparent hover:bg-muted'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {game.selected ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                              game.isHome
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                            )}
                          >
                            {game.isHome ? 'Home' : 'Away'}
                          </span>
                          <span className="font-medium truncate">
                            vs {game.opponent}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(game.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at {game.time}
                        </p>
                        {game.notes && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {game.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isLoading || selectedCount === 0}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {selectedCount} Games
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
