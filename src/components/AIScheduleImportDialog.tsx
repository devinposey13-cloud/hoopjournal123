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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Loader2, CheckCircle2, AlertTriangle, Trash2, Plus, Sparkles, ArrowLeft, Calendar, Eye } from 'lucide-react';
import { ScheduledGame } from '@/types/basketball';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface ParsedGame {
  opponent: string;
  date: string;
  time: string;
  location: string;
  event_name: string;
  home_or_away: 'home' | 'away' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
}

interface AIScheduleImportDialogProps {
  onImport: (games: Omit<ScheduledGame, 'id'>[]) => Promise<any>;
  existingGames?: ScheduledGame[];
  trigger?: React.ReactNode;
}

type Step = 'upload' | 'scanning' | 'review' | 'duplicates' | 'success';

export function AIScheduleImportDialog({ onImport, existingGames = [], trigger }: AIScheduleImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [parsedGames, setParsedGames] = useState<ParsedGame[]>([]);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'replace' | 'import'>('skip');
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const resetState = () => {
    setStep('upload');
    setParsedGames([]);
    setDuplicateIndices(new Set());
    setDuplicateAction('skip');
    setImportedCount(0);
    setErrorMessage('');
    setIsDragging(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetState();
  };

  const processImage = async (file: File) => {
    setStep('scanning');
    setErrorMessage('');

    try {
      // Validate file
      if (!file.type.match(/^image\/(jpeg|png|heic|heif|webp)$/)) {
        setErrorMessage('Please upload a JPG, PNG, or HEIC image.');
        setStep('upload');
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage('Image is too large. Please upload an image under 20MB.');
        setStep('upload');
        return;
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-schedule-image', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) {
        console.error('Parse error:', error);
        setErrorMessage("We couldn't fully read this schedule. Try a clearer image or add games manually.");
        setStep('upload');
        return;
      }

      if (!data?.games || data.games.length === 0) {
        setErrorMessage("We couldn't detect any games in this image. Try a different screenshot or add games manually.");
        setStep('upload');
        return;
      }

      setParsedGames(data.games);
      setStep('review');
    } catch (err) {
      console.error('Image processing error:', err);
      setErrorMessage("Something went wrong. Please try again.");
      setStep('upload');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const updateGame = (index: number, field: keyof ParsedGame, value: string) => {
    setParsedGames(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const removeGame = (index: number) => {
    setParsedGames(prev => prev.filter((_, i) => i !== index));
  };

  const addBlankGame = () => {
    setParsedGames(prev => [...prev, {
      opponent: '',
      date: new Date().toISOString().split('T')[0],
      time: 'TBD',
      location: '',
      event_name: '',
      home_or_away: 'unknown',
      confidence: 'high',
    }]);
  };

  const checkDuplicates = () => {
    const dupes = new Set<number>();
    parsedGames.forEach((game, i) => {
      const isDupe = existingGames.some(existing =>
        existing.opponent.toLowerCase() === game.opponent.toLowerCase() &&
        isSameDay(new Date(existing.date), new Date(game.date))
      );
      if (isDupe) dupes.add(i);
    });
    setDuplicateIndices(dupes);

    if (dupes.size > 0) {
      setStep('duplicates');
    } else {
      performImport(parsedGames);
    }
  };

  const performImport = async (gamesToImport: ParsedGame[]) => {
    try {
      const formatted = gamesToImport.map(g => ({
        date: g.date,
        time: g.time || 'TBD',
        opponent: g.opponent,
        location: g.location || '',
        isHome: g.home_or_away === 'home',
        tournament: g.event_name || undefined,
        notes: undefined,
      }));

      await onImport(formatted);
      setImportedCount(formatted.length);
      setStep('success');
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Failed to import games. Please try again.');
    }
  };

  const handleDuplicateConfirm = () => {
    let gamesToImport = parsedGames;
    if (duplicateAction === 'skip') {
      gamesToImport = parsedGames.filter((_, i) => !duplicateIndices.has(i));
    }
    // 'replace' and 'import' both import all games (replace behavior handled by calendar)
    performImport(gamesToImport);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size={isMobile ? "sm" : "default"} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {isMobile ? "AI Import" : "AI Schedule Import"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn("max-w-2xl", isMobile && "max-h-[90vh]")}>
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Import Your Schedule
              </DialogTitle>
              <DialogDescription>
                Upload a screenshot of your team schedule and Hoop Journal will detect the games.
              </DialogDescription>
            </DialogHeader>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                errorMessage && "border-destructive/50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isMobile ? "Tap to upload or take a photo" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                capture={isMobile ? "environment" : undefined}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {isMobile && (
              <Button
                variant="outline"
                className="gap-2"
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

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}
          </>
        )}

        {step === 'scanning' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-lg font-semibold">Scanning schedule…</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle>Review Detected Games</DialogTitle>
              <DialogDescription>
                We found {parsedGames.length} game{parsedGames.length !== 1 ? 's' : ''} in your schedule. Please review before importing.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className={cn("pr-3", isMobile ? "max-h-[50vh]" : "max-h-[400px]")}>
              <div className="space-y-3">
                {parsedGames.map((game, i) => (
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
                            game.confidence === 'medium' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                            game.confidence === 'low' && "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          )}
                        >
                          {game.confidence === 'high' ? 'High Confidence' : 'Needs Review'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeGame(i)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Opponent</label>
                        <Input
                          value={game.opponent}
                          onChange={(e) => updateGame(i, 'opponent', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Team name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Date</label>
                        <Input
                          type="date"
                          value={game.date}
                          onChange={(e) => updateGame(i, 'date', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Time</label>
                        <Input
                          value={game.time}
                          onChange={(e) => updateGame(i, 'time', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="6:00 PM"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Home/Away</label>
                        <Select
                          value={game.home_or_away}
                          onValueChange={(v) => updateGame(i, 'home_or_away', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">Home</SelectItem>
                            <SelectItem value="away">Away</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Location</label>
                        <Input
                          value={game.location}
                          onChange={(e) => updateGame(i, 'location', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Venue"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Event</label>
                        <Input
                          value={game.event_name}
                          onChange={(e) => updateGame(i, 'event_name', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Tournament"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setStep('upload'); setErrorMessage(''); }}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button variant="outline" size="sm" onClick={addBlankGame}>
                  <Plus className="w-4 h-4 mr-1" /> Add Game
                </Button>
              </div>
              <Button
                onClick={checkDuplicates}
                disabled={parsedGames.length === 0 || parsedGames.some(g => !g.opponent || !g.date)}
              >
                Import {parsedGames.length} Game{parsedGames.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </>
        )}

        {step === 'duplicates' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Duplicates Detected
              </DialogTitle>
              <DialogDescription>
                {duplicateIndices.size} game{duplicateIndices.size !== 1 ? 's' : ''} already exist{duplicateIndices.size === 1 ? 's' : ''} in your schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {Array.from(duplicateIndices).map(i => (
                <div key={i} className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-sm">
                  <span className="font-medium">{parsedGames[i]?.opponent}</span>
                  <span className="text-muted-foreground"> — {parsedGames[i]?.date}</span>
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
                    duplicateAction === action
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium">
                    {action === 'skip' && 'Skip duplicates'}
                    {action === 'replace' && 'Replace existing entries'}
                    {action === 'import' && 'Import anyway'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action === 'skip' && `Import ${parsedGames.length - duplicateIndices.size} new game${parsedGames.length - duplicateIndices.size !== 1 ? 's' : ''} only`}
                    {action === 'replace' && 'Overwrite matching games with new data'}
                    {action === 'import' && 'Import all games including duplicates'}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep('review')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleDuplicateConfirm}>Confirm Import</Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="text-xl font-bold">Schedule Imported!</p>
              <p className="text-muted-foreground mt-1">
                {importedCount} game{importedCount !== 1 ? 's' : ''} added to your season.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                <Calendar className="w-4 h-4 mr-1" /> View Calendar
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                <Eye className="w-4 h-4 mr-1" /> View Upcoming
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
