import { useState, useRef, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Upload, Calendar, CheckCircle2, Loader2, FileText, Camera, AlertTriangle, Trash2, Plus, Sparkles, ArrowLeft, Eye } from 'lucide-react';
import { parseRSSSchedule, filterFutureGames } from '@/utils/rssParser';
import { parseICalSchedule, filterFutureICalGames, detectScheduleFormat } from '@/utils/icalParser';
import { ScheduledGame } from '@/types/basketball';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { isSameDay } from 'date-fns';

interface ImportScheduleDialogProps {
  onImport: (games: Omit<ScheduledGame, 'id'>[]) => Promise<ScheduledGame[] | void>;
  isMobile?: boolean;
  existingGames?: ScheduledGame[];
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

interface AIParsedGame {
  opponent: string;
  date: string;
  time: string;
  location: string;
  event_name: string;
  home_or_away: 'home' | 'away' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}

type AIStep = 'upload' | 'scanning' | 'review' | 'duplicates' | 'success';

export function ImportScheduleDialog({ onImport, isMobile, existingGames = [] }: ImportScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'ai' | 'feed'>('ai');

  // Feed import state
  const [feedContent, setFeedContent] = useState('');
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [futureOnly, setFutureOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [feedStep, setFeedStep] = useState<'input' | 'preview'>('input');
  const [formatTab, setFormatTab] = useState<'auto' | 'rss' | 'ical'>('auto');

  // AI import state
  const [aiStep, setAiStep] = useState<AIStep>('upload');
  const [aiParsedGames, setAiParsedGames] = useState<AIParsedGame[]>([]);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'replace' | 'import'>('skip');
  const [importedCount, setImportedCount] = useState(0);
  const [aiError, setAiError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobileDevice = useIsMobile();

  // ---- Feed import logic ----
  const isUrl = (text: string) => {
    const trimmed = text.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  };

  const fetchFromUrl = async (url: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-schedule', {
        body: { url },
      });
      if (error) throw new Error(error.message || 'Failed to fetch schedule');
      if (data?.error) throw new Error(data.error);
      if (data?.content) {
        setFeedContent(data.content);
        toast.success('Schedule fetched successfully');
      } else {
        throw new Error('No content returned');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Could not fetch URL. Please copy the file content and paste it here instead.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleContentChange = (value: string) => {
    setFeedContent(value);
    if (isUrl(value) && value.trim().split('\n').length === 1) {
      fetchFromUrl(value.trim());
    }
  };

  const handleParse = () => {
    if (!feedContent.trim()) {
      toast.error('Please paste the schedule content');
      return;
    }
    if (isUrl(feedContent.trim()) && !feedContent.includes('BEGIN:')) {
      toast.error('Please paste the actual iCal/RSS content, not the URL.');
      return;
    }
    try {
      let games: { opponent: string; date: string; time: string; location: string; isHome: boolean; notes?: string }[] = [];
      let format = formatTab === 'auto' ? detectScheduleFormat(feedContent) : formatTab;
      if (format === 'unknown' && formatTab === 'auto') {
        try { games = parseICalSchedule(feedContent); format = 'ical'; }
        catch { try { games = parseRSSSchedule(feedContent); format = 'rss'; }
        catch { toast.error('Could not detect format.'); return; } }
      } else if (format === 'ical' || formatTab === 'ical') {
        games = parseICalSchedule(feedContent);
      } else {
        games = parseRSSSchedule(feedContent);
      }
      if (futureOnly) {
        games = format === 'ical' ? filterFutureICalGames(games) : filterFutureGames(games);
      }
      if (games.length === 0) { toast.error('No games found'); return; }
      setParsedGames(games.map((g) => ({ ...g, selected: true })));
      setFeedStep('preview');
      toast.success(`Found ${games.length} games`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse schedule.');
    }
  };

  const toggleGame = (index: number) => {
    setParsedGames((prev) => prev.map((g, i) => (i === index ? { ...g, selected: !g.selected } : g)));
  };

  const toggleAll = () => {
    const allSelected = parsedGames.every((g) => g.selected);
    setParsedGames((prev) => prev.map((g) => ({ ...g, selected: !allSelected })));
  };

  const handleFeedImport = async () => {
    const selectedGames = parsedGames.filter((g) => g.selected);
    if (selectedGames.length === 0) { toast.error('Select at least one game'); return; }
    setIsLoading(true);
    try {
      const gamesToImport = selectedGames.map(({ selected, ...game }) => game);
      await onImport(gamesToImport);
      toast.success(`Imported ${selectedGames.length} games`);
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import games');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- AI import logic ----
  const processImage = async (file: File) => {
    setAiStep('scanning');
    setAiError('');
    try {
      if (!file.type.match(/^image\/(jpeg|png|heic|heif|webp)$/)) {
        setAiError('Please upload a JPG, PNG, or HEIC image.');
        setAiStep('upload');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setAiError('Image is too large (max 20MB).');
        setAiStep('upload');
        return;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('parse-schedule-image', {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) {
        setAiError("We couldn't read this schedule. Try a clearer image.");
        setAiStep('upload');
        return;
      }
      if (!data?.games || data.games.length === 0) {
        setAiError("No games detected. Try a different screenshot.");
        setAiStep('upload');
        return;
      }
      setAiParsedGames(data.games);
      setAiStep('review');
    } catch {
      setAiError("Something went wrong. Please try again.");
      setAiStep('upload');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  }, []);

  const updateAiGame = (index: number, field: keyof AIParsedGame, value: string) => {
    setAiParsedGames(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const removeAiGame = (index: number) => {
    setAiParsedGames(prev => prev.filter((_, i) => i !== index));
  };

  const addBlankAiGame = () => {
    setAiParsedGames(prev => [...prev, {
      opponent: '', date: new Date().toISOString().split('T')[0], time: 'TBD',
      location: '', event_name: '', home_or_away: 'unknown', confidence: 'high',
    }]);
  };

  const checkAiDuplicates = () => {
    const dupes = new Set<number>();
    aiParsedGames.forEach((game, i) => {
      const isDupe = existingGames.some(existing =>
        existing.opponent.toLowerCase() === game.opponent.toLowerCase() &&
        isSameDay(new Date(existing.date), new Date(game.date))
      );
      if (isDupe) dupes.add(i);
    });
    setDuplicateIndices(dupes);
    if (dupes.size > 0) { setAiStep('duplicates'); } else { performAiImport(aiParsedGames); }
  };

  const performAiImport = async (gamesToImport: AIParsedGame[]) => {
    try {
      const formatted = gamesToImport.map(g => ({
        date: g.date, time: g.time || 'TBD', opponent: g.opponent,
        location: g.location || '', isHome: g.home_or_away === 'home',
        tournament: g.event_name || undefined, notes: undefined,
      }));
      await onImport(formatted);
      setImportedCount(formatted.length);
      setAiStep('success');
    } catch {
      toast.error('Failed to import games.');
    }
  };

  const handleDuplicateConfirm = () => {
    let games = aiParsedGames;
    if (duplicateAction === 'skip') {
      games = aiParsedGames.filter((_, i) => !duplicateIndices.has(i));
    }
    performAiImport(games);
  };

  // ---- Shared ----
  const handleClose = () => {
    setOpen(false);
    setFeedContent('');
    setParsedGames([]);
    setFeedStep('input');
    setFormatTab('auto');
    setAiStep('upload');
    setAiParsedGames([]);
    setDuplicateIndices(new Set());
    setDuplicateAction('skip');
    setImportedCount(0);
    setAiError('');
    setIsDragging(false);
  };

  const selectedCount = parsedGames.filter((g) => g.selected).length;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size={isMobile ? "icon" : "sm"} title="Import Schedule">
          <Calendar className="w-4 h-4" />
          {!isMobile && <span className="ml-2">Import Schedule</span>}
          {isMobile && <span className="sr-only">Import Schedule</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-lg overflow-hidden flex flex-col", isMobileDevice && "max-h-[90vh]")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Schedule
          </DialogTitle>
          <DialogDescription>
            {mainTab === 'ai'
              ? (aiStep === 'upload' ? 'Upload a screenshot of your schedule and AI will detect the games' :
                 aiStep === 'review' ? `Review ${aiParsedGames.length} detected game${aiParsedGames.length !== 1 ? 's' : ''}` :
                 aiStep === 'success' ? 'Import complete' :
                 aiStep === 'duplicates' ? 'Some games already exist' :
                 'Scanning your schedule...')
              : (feedStep === 'input'
                ? 'Paste an RSS feed or iCal (.ics) file content from your league website'
                : `Select games to import (${selectedCount} of ${parsedGames.length} selected)`)}
          </DialogDescription>
        </DialogHeader>

        {/* Only show top-level tabs when in initial state */}
        {((mainTab === 'ai' && aiStep === 'upload') || (mainTab === 'feed' && feedStep === 'input')) && (
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'ai' | 'feed')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Image Import
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                RSS / iCal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* ========== AI TAB ========== */}
        {mainTab === 'ai' && (
          <>
            {aiStep === 'upload' && (
              <div className="space-y-3">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    aiError && "border-destructive/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isMobileDevice ? "Tap to upload or take a photo" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC supported</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {isMobileDevice && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) processImage(file);
                      };
                      input.click();
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </Button>
                )}

                {aiError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{aiError}</p>
                  </div>
                )}
              </div>
            )}

            {aiStep === 'scanning' && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                <div>
                  <p className="text-lg font-semibold">Scanning schedule…</p>
                  <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}

            {aiStep === 'review' && (
              <div className="space-y-3 min-h-0 flex flex-col">
                <ScrollArea className="pr-3 h-[350px] flex-shrink min-h-0">
                  <div className="space-y-3">
                    {aiParsedGames.map((game, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          game.confidence === 'low'
                            ? "border-amber-500/50 bg-amber-500/5"
                            : "border-border bg-secondary/30"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Game {i + 1}</span>
                            <Badge
                              variant={game.confidence === 'high' ? 'default' : 'secondary'}
                              className={cn(
                                "text-xs",
                                game.confidence === 'high' && "bg-green-500/20 text-green-400 border-green-500/30",
                                (game.confidence === 'medium' || game.confidence === 'low') && "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              )}
                            >
                              {game.confidence === 'high' ? 'High Confidence' : 'Needs Review'}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAiGame(i)}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Opponent</label>
                            <Input value={game.opponent} onChange={(e) => updateAiGame(i, 'opponent', e.target.value)} className="h-8 text-sm" placeholder="Team name" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Date</label>
                            <Input type="date" value={game.date} onChange={(e) => updateAiGame(i, 'date', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Time</label>
                            <Input value={game.time} onChange={(e) => updateAiGame(i, 'time', e.target.value)} className="h-8 text-sm" placeholder="6:00 PM" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Home/Away</label>
                            <Select value={game.home_or_away} onValueChange={(v) => updateAiGame(i, 'home_or_away', v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="away">Away</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Location</label>
                            <Input value={game.location} onChange={(e) => updateAiGame(i, 'location', e.target.value)} className="h-8 text-sm" placeholder="Venue" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Event</label>
                            <Input value={game.event_name} onChange={(e) => updateAiGame(i, 'event_name', e.target.value)} className="h-8 text-sm" placeholder="Tournament" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setAiStep('upload'); setAiError(''); }}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button variant="outline" size="sm" onClick={addBlankAiGame}>
                      <Plus className="w-4 h-4 mr-1" /> Add Game
                    </Button>
                  </div>
                  <Button onClick={checkAiDuplicates} disabled={aiParsedGames.length === 0 || aiParsedGames.some(g => !g.opponent || !g.date)}>
                    Import {aiParsedGames.length} Game{aiParsedGames.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}

            {aiStep === 'duplicates' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {Array.from(duplicateIndices).map(i => (
                    <div key={i} className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-sm">
                      <span className="font-medium">{aiParsedGames[i]?.opponent}</span>
                      <span className="text-muted-foreground"> — {aiParsedGames[i]?.date}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(['skip', 'replace', 'import'] as const).map(action => (
                    <button
                      key={action}
                      onClick={() => setDuplicateAction(action)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left text-sm transition-colors",
                        duplicateAction === action ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-medium">
                        {action === 'skip' && 'Skip duplicates'}
                        {action === 'replace' && 'Replace existing entries'}
                        {action === 'import' && 'Import anyway'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action === 'skip' && `Import ${aiParsedGames.length - duplicateIndices.size} new game${aiParsedGames.length - duplicateIndices.size !== 1 ? 's' : ''} only`}
                        {action === 'replace' && 'Overwrite matching games with new data'}
                        {action === 'import' && 'Import all games including duplicates'}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setAiStep('review')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleDuplicateConfirm}>Confirm Import</Button>
                </div>
              </div>
            )}

            {aiStep === 'success' && (
              <div className="py-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <p className="text-xl font-bold">Schedule Imported!</p>
                  <p className="text-muted-foreground mt-1">
                    {importedCount} game{importedCount !== 1 ? 's' : ''} added to your season.
                  </p>
                </div>
                <Button onClick={handleClose}>Done</Button>
              </div>
            )}
          </>
        )}

        {/* ========== FEED TAB ========== */}
        {mainTab === 'feed' && (
          <>
            {feedStep === 'input' ? (
              <div className="space-y-4">
                <Tabs value={formatTab} onValueChange={(v) => setFormatTab(v as typeof formatTab)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="auto">Auto-Detect</TabsTrigger>
                    <TabsTrigger value="rss">RSS Feed</TabsTrigger>
                    <TabsTrigger value="ical">iCal (.ics)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="auto" className="mt-4">
                    <p className="text-xs text-muted-foreground">Paste any schedule content and we'll detect the format automatically.</p>
                  </TabsContent>
                  <TabsContent value="rss" className="mt-4">
                    <p className="text-xs text-muted-foreground">Paste RSS XML content from PrestoSports, WCAC, or similar league feeds.</p>
                  </TabsContent>
                  <TabsContent value="ical" className="mt-4">
                    <p className="text-xs text-muted-foreground">Paste iCal (.ics) content from Google Calendar, Outlook, or team apps.</p>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label htmlFor="feed-content">Schedule Content or URL</Label>
                  <Textarea
                    id="feed-content"
                    placeholder={formatTab === 'ical'
                      ? "Paste URL or iCal content:\nBEGIN:VCALENDAR\nVERSION:2.0\n..."
                      : formatTab === 'rss'
                      ? "Paste URL or RSS content:\n<?xml version=\"1.0\"?>\n<rss>..."
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

                <div className="flex items-center gap-2">
                  <Switch id="future-only" checked={futureOnly} onCheckedChange={setFutureOnly} />
                  <Label htmlFor="future-only" className="text-sm">Import future games only</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
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
                  <span className="text-sm text-muted-foreground">{selectedCount} games selected</span>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {parsedGames.map((game, index) => (
                      <button
                        key={index}
                        onClick={() => toggleGame(index)}
                        className={cn(
                          'w-full p-3 rounded-lg text-left transition-colors',
                          game.selected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 border border-transparent hover:bg-muted'
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
                              <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', game.isHome ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')}>
                                {game.isHome ? 'Home' : 'Away'}
                              </span>
                              <span className="font-medium truncate">vs {game.opponent}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {game.time}
                            </p>
                            {game.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{game.notes}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setFeedStep('input')}>Back</Button>
                  <Button onClick={handleFeedImport} disabled={isLoading || selectedCount === 0}>
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import {selectedCount} Games
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
