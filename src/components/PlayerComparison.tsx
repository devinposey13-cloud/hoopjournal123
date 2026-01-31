import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Users, Loader2, Volume2, VolumeX, ExternalLink, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface SeasonStats {
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  avgSteals: number;
  avgBlocks: number;
  fgPercentage: number;
}

interface PlayerProfile {
  name: string;
  position: string;
}

interface PlayerComparisonProps {
  seasonStats: SeasonStats;
  profile: PlayerProfile;
}

export function PlayerComparison({ seasonStats, profile }: PlayerComparisonProps) {
  const [result, setResult] = useState<{ comparison: string; citations: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();

  const hasStats = seasonStats.avgPoints > 0 || seasonStats.avgRebounds > 0 || seasonStats.avgAssists > 0;

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('perplexity-compare', {
        body: { 
          stats: seasonStats,
          position: profile.position,
          playerName: profile.name
        }
      });
      
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      setResult(data);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compare');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Your Season Averages
          </CardTitle>
          <CardDescription>
            These stats will be used to find similar NBA/WNBA players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasStats ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No game stats recorded yet.</p>
              <p className="text-sm mt-1">Log some games to see your averages and find player comparisons!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.avgPoints.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">PPG</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.avgRebounds.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">RPG</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.avgAssists.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">APG</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.avgSteals.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">SPG</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.avgBlocks.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">BPG</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{seasonStats.fgPercentage.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">FG%</div>
                </div>
              </div>
              
              {isLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <LoadingSpinner size="sm" message="Finding similar NBA/WNBA players..." />
                  </CardContent>
                </Card>
              ) : (
                <Button 
                  onClick={handleCompare} 
                  disabled={isLoading}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Users className="w-4 h-4" />
                  Find Similar NBA/WNBA Players
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-center text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Player Comparisons
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => playingIndex === 0 ? stopVoice() : playVoice(result.comparison, 0)}
              disabled={isLoadingAudio}
              className={cn("gap-2", playingIndex === 0 && "text-primary animate-pulse")}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : playingIndex === 0 ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Listen
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.comparison}</ReactMarkdown>
            </div>
            
            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2 text-muted-foreground">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {result.citations.map((citation, index) => (
                    <a
                      key={index}
                      href={citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Source {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
