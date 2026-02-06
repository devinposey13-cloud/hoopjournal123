import { useState, useCallback } from 'react';
import { Mic, MicOff, Sparkles, Loader2, AlertCircle, Check, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AudioWaveform } from '@/components/AudioWaveform';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { toast } from 'sonner';
import { GameStats } from '@/types/basketball';
import { cn } from '@/lib/utils';

const EXTRACT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-game-stats`;

interface ExtractedStats {
  opponent: string;
  points: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutesPlayed: number;
  fgMade: number;
  fgAttempted: number;
  threePtMade: number;
  threePtAttempted: number;
  ftMade: number;
  ftAttempted: number;
  isWin: boolean | null;
  finalScoreUs: number | null;
  finalScoreThem: number | null;
  halftimeScoreUs: number | null;
  halftimeScoreThem: number | null;
  confidence: number;
  missingFields: string[];
}

interface AIStatsCaptureProps {
  onSubmit: (game: Omit<GameStats, 'id'>) => Promise<void>;
  defaultDate?: string;
}

export function AIStatsCapture({ onSubmit, defaultDate }: AIStatsCaptureProps) {
  const [description, setDescription] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedStats, setExtractedStats] = useState<ExtractedStats | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [gameDate, setGameDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  
  const { isRecording, isTranscribing, audioData, startRecording, stopRecording, cancelRecording } = useVoiceInput();

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setDescription(prev => prev ? `${prev} ${transcription}` : transcription);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const extractStats = useCallback(async () => {
    if (!description.trim()) {
      toast.error('Please describe your game first');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch(EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ description, date: gameDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract stats');
      }

      const stats = await response.json();
      setExtractedStats(stats);
      setEditMode(false);
      toast.success('Stats extracted! Review and save.');
    } catch (error) {
      console.error('Extract error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract stats');
    } finally {
      setIsExtracting(false);
    }
  }, [description, gameDate]);

  const handleSave = useCallback(async () => {
    if (!extractedStats) return;

    const gameData: Omit<GameStats, 'id'> = {
      date: gameDate,
      opponent: extractedStats.opponent,
      points: extractedStats.points,
      rebounds: extractedStats.rebounds,
      offensiveRebounds: extractedStats.offensiveRebounds,
      defensiveRebounds: extractedStats.defensiveRebounds,
      assists: extractedStats.assists,
      steals: extractedStats.steals,
      blocks: extractedStats.blocks,
      turnovers: extractedStats.turnovers,
      fouls: extractedStats.fouls,
      minutesPlayed: extractedStats.minutesPlayed,
      fgMade: extractedStats.fgMade,
      fgAttempted: extractedStats.fgAttempted,
      threePtMade: extractedStats.threePtMade,
      threePtAttempted: extractedStats.threePtAttempted,
      ftMade: extractedStats.ftMade,
      ftAttempted: extractedStats.ftAttempted,
      isWin: extractedStats.isWin ?? false,
      finalScoreUs: extractedStats.finalScoreUs ?? undefined,
      finalScoreThem: extractedStats.finalScoreThem ?? undefined,
      halftimeScoreUs: extractedStats.halftimeScoreUs ?? undefined,
      halftimeScoreThem: extractedStats.halftimeScoreThem ?? undefined,
    };

    await onSubmit(gameData);
  }, [extractedStats, gameDate, onSubmit]);

  const updateStat = useCallback((key: keyof ExtractedStats, value: number | boolean | string | null) => {
    if (!extractedStats) return;
    setExtractedStats(prev => prev ? { ...prev, [key]: value } : null);
  }, [extractedStats]);

  const resetCapture = useCallback(() => {
    setDescription('');
    setExtractedStats(null);
    setEditMode(false);
  }, []);

  // If we have extracted stats, show the preview
  if (extractedStats) {
    return (
      <div className="space-y-4">
        {/* Confidence indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <Badge 
              variant={extractedStats.confidence >= 70 ? "default" : "secondary"}
              className={
                extractedStats.confidence >= 70 ? "bg-primary" : "bg-muted-foreground"
              }
            >
              {extractedStats.confidence}% confidence
            </Badge>
            {extractedStats.missingFields.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Missing: {extractedStats.missingFields.join(', ')}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editMode ? 'Done' : 'Edit'}
          </Button>
        </div>

        {/* Stats Preview Card */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Opponent and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Opponent</Label>
                {editMode ? (
                  <Input 
                    value={extractedStats.opponent} 
                    onChange={e => updateStat('opponent', e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <p className="font-semibold">{extractedStats.opponent}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                {editMode ? (
                  <Input 
                    type="date"
                    value={gameDate} 
                    onChange={e => setGameDate(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <p className="font-semibold">{new Date(gameDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Win/Loss */}
            <div className="flex items-center gap-4">
              <Label className="text-sm">Result:</Label>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={extractedStats.isWin ?? false}
                    onCheckedChange={v => updateStat('isWin', v)}
                  />
                  <span className="text-sm">{extractedStats.isWin ? 'Win' : 'Loss'}</span>
                </div>
              ) : (
                <Badge variant={extractedStats.isWin ? "default" : "secondary"}>
                  {extractedStats.isWin === null ? 'Unknown' : extractedStats.isWin ? 'Win' : 'Loss'}
                </Badge>
              )}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <StatCell 
                label="PTS" 
                value={extractedStats.points} 
                editMode={editMode}
                onChange={v => updateStat('points', v)}
                highlight
              />
              <StatCell 
                label="REB" 
                value={extractedStats.rebounds} 
                editMode={editMode}
                onChange={v => updateStat('rebounds', v)}
              />
              <StatCell 
                label="AST" 
                value={extractedStats.assists} 
                editMode={editMode}
                onChange={v => updateStat('assists', v)}
              />
              <StatCell 
                label="MIN" 
                value={extractedStats.minutesPlayed} 
                editMode={editMode}
                onChange={v => updateStat('minutesPlayed', v)}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCell 
                label="STL" 
                value={extractedStats.steals} 
                editMode={editMode}
                onChange={v => updateStat('steals', v)}
              />
              <StatCell 
                label="BLK" 
                value={extractedStats.blocks} 
                editMode={editMode}
                onChange={v => updateStat('blocks', v)}
              />
              <StatCell 
                label="TO" 
                value={extractedStats.turnovers} 
                editMode={editMode}
                onChange={v => updateStat('turnovers', v)}
              />
              <StatCell 
                label="PF" 
                value={extractedStats.fouls} 
                editMode={editMode}
                onChange={v => updateStat('fouls', v)}
              />
            </div>

            {/* Shooting Stats */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">Shooting</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">FG</p>
                  {editMode ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={extractedStats.fgMade}
                        onChange={e => updateStat('fgMade', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                      <span>/</span>
                      <Input 
                        type="number" 
                        value={extractedStats.fgAttempted}
                        onChange={e => updateStat('fgAttempted', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                    </div>
                  ) : (
                    <p className="font-semibold">{extractedStats.fgMade}/{extractedStats.fgAttempted}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">3PT</p>
                  {editMode ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={extractedStats.threePtMade}
                        onChange={e => updateStat('threePtMade', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                      <span>/</span>
                      <Input 
                        type="number" 
                        value={extractedStats.threePtAttempted}
                        onChange={e => updateStat('threePtAttempted', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                    </div>
                  ) : (
                    <p className="font-semibold">{extractedStats.threePtMade}/{extractedStats.threePtAttempted}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">FT</p>
                  {editMode ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={extractedStats.ftMade}
                        onChange={e => updateStat('ftMade', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                      <span>/</span>
                      <Input 
                        type="number" 
                        value={extractedStats.ftAttempted}
                        onChange={e => updateStat('ftAttempted', parseInt(e.target.value) || 0)}
                        className="w-12 h-7 text-center text-sm p-1"
                      />
                    </div>
                  ) : (
                    <p className="font-semibold">{extractedStats.ftMade}/{extractedStats.ftAttempted}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={resetCapture}>
            Start Over
          </Button>
          <Button className="flex-1 gradient-primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Game
          </Button>
        </div>
      </div>
    );
  }

  // Input mode
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Game Date</Label>
        <Input 
          type="date" 
          value={gameDate}
          onChange={e => setGameDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Describe Your Game</Label>
        <div className="relative">
          <Textarea
            placeholder="Tell me about your game! Example: 'I scored 18 points on 7-for-12 shooting with 5 rebounds and 3 assists. We beat Central High 62-55.'"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-[120px] pr-12"
            disabled={isRecording || isTranscribing}
          />
          
          {/* Voice input button */}
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            className={cn(
              "absolute right-2 bottom-2",
              isRecording && "animate-pulse"
            )}
            onClick={handleVoiceInput}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {/* Audio waveform */}
        {isRecording && (
          <div className="rounded-lg bg-muted p-2">
            <AudioWaveform audioData={audioData} isRecording={isRecording} />
            <p className="text-xs text-center text-muted-foreground mt-1">
              Listening... Tap the mic to stop
            </p>
          </div>
        )}

        {isTranscribing && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Transcribing...
          </p>
        )}
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Try saying something like:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "18 points, 5 rebounds, beat Lincoln",
            "Shot 3-for-8 from three, 2 assists",
            "Great game! 22 points, we won 62-55"
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => setDescription(example)}
              className="text-xs bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Extract button */}
      <Button 
        className="w-full gradient-primary"
        onClick={extractStats}
        disabled={!description.trim() || isExtracting || isRecording || isTranscribing}
      >
        {isExtracting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Extracting Stats...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Extract Stats with AI
          </>
        )}
      </Button>
    </div>
  );
}

// Helper component for stat cells
function StatCell({ 
  label, 
  value, 
  editMode, 
  onChange,
  highlight 
}: { 
  label: string; 
  value: number; 
  editMode: boolean;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "text-center p-2 rounded-lg",
      highlight ? "bg-primary/10" : "bg-muted/50"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {editMode ? (
        <Input 
          type="number"
          value={value}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full h-7 text-center text-lg font-bold p-0"
        />
      ) : (
        <p className={cn(
          "text-lg font-bold",
          highlight && "text-primary"
        )}>{value}</p>
      )}
    </div>
  );
}
