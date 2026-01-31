import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCoachVoice } from '@/hooks/useCoachVoice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, Loader2, Volume2, VolumeX, ExternalLink, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const SUGGESTED_TOPICS = [
  "How to improve my crossover dribble",
  "Defensive drills for guards",
  "NBA shooting form tips",
  "Post move fundamentals",
  "Basketball conditioning workouts",
  "Pick and roll offensive plays",
  "How to improve vertical jump",
  "Ball handling drills for beginners",
];

export function BasketballKnowledge() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ answer: string; citations: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playingIndex, isLoadingAudio, playVoice, stopVoice } = useCoachVoice();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('perplexity-search', {
        body: { query: searchQuery }
      });
      
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      setResult(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Basketball Knowledge Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about drills, techniques, strategies..."
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>
          
          {/* Suggested Topics */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              Suggested topics:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map((topic) => (
                <Badge
                  key={topic}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleSuggestionClick(topic)}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <LoadingSpinner size="sm" message="Searching basketball knowledge..." />
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-lg">Answer</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => playingIndex === 0 ? stopVoice() : playVoice(result.answer, 0)}
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
              <ReactMarkdown>{result.answer}</ReactMarkdown>
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
