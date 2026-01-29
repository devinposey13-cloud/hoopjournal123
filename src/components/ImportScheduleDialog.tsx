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
import { Upload, Calendar, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { parseRSSSchedule, filterFutureGames } from '@/utils/rssParser';
import { parseICalSchedule, filterFutureICalGames, detectScheduleFormat } from '@/utils/icalParser';
import { ScheduledGame } from '@/types/basketball';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const [feedContent, setFeedContent] = useState('');
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [futureOnly, setFutureOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [formatTab, setFormatTab] = useState<'auto' | 'rss' | 'ical'>('auto');

  // Detect if input is a URL and fetch content
  const isUrl = (text: string) => {
    const trimmed = text.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  };

  const fetchFromUrl = async (url: string) => {
    setIsFetching(true);
    try {
      // Use a CORS proxy for fetching external URLs
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const content = await response.text();
      setFeedContent(content);
      toast.success('Schedule fetched successfully');
    } catch (error) {
      console.error('Fetch error:', error);
      // If direct fetch fails, show instructions
      toast.error('Could not fetch URL directly. Please copy the file content and paste it here instead.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleContentChange = (value: string) => {
    setFeedContent(value);
    // Auto-detect and fetch if it's a URL
    if (isUrl(value) && value.trim().split('\n').length === 1) {
      fetchFromUrl(value.trim());
    }
  };

  const handleParse = () => {
    if (!feedContent.trim()) {
      toast.error('Please paste the schedule content');
      return;
    }

    // Check if user pasted a URL but we couldn't fetch it
    if (isUrl(feedContent.trim()) && !feedContent.includes('BEGIN:')) {
      toast.error('Please paste the actual iCal/RSS content, not the URL. Open the URL in your browser and copy its contents.');
      return;
    }

    try {
      let games: { opponent: string; date: string; time: string; location: string; isHome: boolean; notes?: string }[] = [];
      
      // Detect format or use selected format
      let format = formatTab === 'auto' ? detectScheduleFormat(feedContent) : formatTab;
      
      if (format === 'unknown' && formatTab === 'auto') {
        // Try both parsers
        try {
          games = parseICalSchedule(feedContent);
          format = 'ical';
        } catch {
          try {
            games = parseRSSSchedule(feedContent);
            format = 'rss';
          } catch {
            toast.error('Could not detect format. Please select RSS or iCal manually.');
            return;
          }
        }
      } else if (format === 'ical' || formatTab === 'ical') {
        games = parseICalSchedule(feedContent);
      } else {
        games = parseRSSSchedule(feedContent);
      }
      
      if (futureOnly) {
        games = format === 'ical' ? filterFutureICalGames(games) : filterFutureGames(games);
      }

      if (games.length === 0) {
        toast.error('No games found in the schedule');
        return;
      }

      setParsedGames(games.map((g) => ({ ...g, selected: true })));
      setStep('preview');
      toast.success(`Found ${games.length} games`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse schedule. Please check the format.');
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
    setFeedContent('');
    setParsedGames([]);
    setStep('input');
    setFormatTab('auto');
  };

  const selectedCount = parsedGames.filter((g) => g.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          Import Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Schedule
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Paste an RSS feed or iCal (.ics) file content from your league website'
              : `Select games to import (${selectedCount} of ${parsedGames.length} selected)`}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <Tabs value={formatTab} onValueChange={(v) => setFormatTab(v as typeof formatTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="auto">Auto-Detect</TabsTrigger>
                <TabsTrigger value="rss">RSS Feed</TabsTrigger>
                <TabsTrigger value="ical">iCal (.ics)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="auto" className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Paste any schedule content and we'll detect the format automatically.
                </p>
              </TabsContent>
              
              <TabsContent value="rss" className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Paste RSS XML content from PrestoSports, WCAC, or similar league feeds.
                </p>
              </TabsContent>
              
              <TabsContent value="ical" className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Paste iCal (.ics) content. You can export this from Google Calendar, Outlook, or team management apps.
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="feed-content">Schedule Content or URL</Label>
              <Textarea
                id="feed-content"
                placeholder={formatTab === 'ical' 
                  ? "Paste URL (https://...) or iCal content:\nBEGIN:VCALENDAR\nVERSION:2.0\n..." 
                  : formatTab === 'rss'
                  ? "Paste URL (https://...) or RSS content:\n<?xml version=\"1.0\"?>\n<rss>..."
                  : "Paste a URL or schedule content here..."}
                value={feedContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
                disabled={isFetching}
              />
              {isFetching && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching schedule from URL...
                </p>
              )}
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
                Parse Schedule
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
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
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
