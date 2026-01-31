import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameStats } from '@/types/basketball';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw, Volume2, VolumeX, Mail, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface EarnedMilestone {
  name: string;
  rarity: string;
}

interface PostGameRecapProps {
  game: GameStats;
  earnedMilestones?: EarnedMilestone[];
  onRecapChange?: (recap: string | null, includeInPdf: boolean) => void;
  playerName?: string;
  playerTeam?: string;
  parentEmail?: string | null;
}

export function PostGameRecap({ game, earnedMilestones, onRecapChange, playerName, playerTeam, parentEmail }: PostGameRecapProps) {
  const [recap, setRecap] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [includeInPdf, setIncludeInPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Parent email sending state
  const [isSendingToParent, setIsSendingToParent] = useState(false);
  const [hasSentToParent, setHasSentToParent] = useState(false);
  
  // Voice playback
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();

  const generateRecap = async () => {
    setIsLoading(true);
    setError(null);
    setRecap('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to get your post-game recap');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-game-recap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gameStats: game, earnedMilestones }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again in a moment.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error('Failed to generate recap');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullRecap = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullRecap += content;
              setRecap(fullRecap);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      setHasGenerated(true);
    } catch (err) {
      console.error('Error generating recap:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate recap');
    } finally {
      setIsLoading(false);
    }
  };

  const sendToParent = async () => {
    if (!playerName || !playerTeam) {
      toast({
        title: "Missing player info",
        description: "Player name and team are required to send the recap.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingToParent(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to send the recap');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-parent-recap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          gameStats: {
            opponent: game.opponent,
            points: game.points,
            rebounds: game.rebounds,
            assists: game.assists,
            steals: game.steals,
            blocks: game.blocks,
            isWin: game.isWin,
            date: game.date,
          },
          recap,
          playerName,
          playerTeam,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === "No parent email configured") {
          toast({
            title: "No parent email set up",
            description: "Add a parent email in Settings to share recaps.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.error || 'Failed to send');
        }
        return;
      }

      setHasSentToParent(true);
      toast({
        title: "Recap sent!",
        description: "Your game recap has been sent to your parent.",
      });
    } catch (err) {
      console.error('Error sending to parent:', err);
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToParent(false);
    }
  };

  useEffect(() => {
    if (onRecapChange) {
      onRecapChange(hasGenerated ? recap : null, includeInPdf);
    }
  }, [recap, includeInPdf, hasGenerated, onRecapChange]);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Post-Game Recap from Coach AI</h2>
        </div>
        {hasGenerated && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="include-pdf"
                checked={includeInPdf}
                onCheckedChange={setIncludeInPdf}
              />
              <Label htmlFor="include-pdf" className="text-sm text-muted-foreground">
                Include in PDF
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateRecap}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        )}
      </div>

      {!hasGenerated && !isLoading && (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto text-yellow-400/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            Get personalized, encouraging feedback on your game performance!
          </p>
          <Button onClick={generateRecap} className="gradient-primary">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate My Recap
          </Button>
        </div>
      )}

      {isLoading && !recap && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Coach AI is reviewing your performance...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-6">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={generateRecap}>
            Try Again
          </Button>
        </div>
      )}

      {recap && (
        <div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-foreground">{children}</li>,
                h1: ({ children }) => <h3 className="text-lg font-bold mb-2 text-foreground">{children}</h3>,
                h2: ({ children }) => <h3 className="text-lg font-bold mb-2 text-foreground">{children}</h3>,
                h3: ({ children }) => <h4 className="font-semibold mb-2 text-foreground">{children}</h4>,
              }}
            >
              {recap}
            </ReactMarkdown>
          </div>
          
          {/* Voice playback button */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2",
                playingIndex === 0 && "text-primary border-primary animate-pulse"
              )}
              onClick={() => playVoice(recap, 0)}
              disabled={isLoadingAudio && playingIndex !== 0}
            >
              {isLoadingAudio && playingIndex === null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : playingIndex === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {playingIndex === 0 ? 'Stop Playback' : 'Listen to Recap'}
            </Button>

            {/* Share with Family button - only show if parent email exists */}
            {parentEmail && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2",
                  hasSentToParent && "text-green-500 border-green-500"
                )}
                onClick={sendToParent}
                disabled={isSendingToParent || hasSentToParent}
              >
                {isSendingToParent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : hasSentToParent ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {hasSentToParent ? 'Sent to Parent!' : 'Share with Family'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
