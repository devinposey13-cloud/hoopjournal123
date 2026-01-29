import { useState } from 'react';
import { Music, ChevronUp, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface PersistentMusicBarProps {
  url: string | null | undefined;
}

function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('spotify.com')) {
      return null;
    }
    
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const type = pathParts[0];
      const id = pathParts[1].split('?')[0];
      
      if (['playlist', 'track', 'album', 'episode', 'show'].includes(type) && id) {
        return { type, id };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export function PersistentMusicBar({ url }: PersistentMusicBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!url) {
    return null;
  }

  const parsed = parseSpotifyUrl(url);
  
  if (!parsed) {
    return null;
  }

  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=0`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header bar - always visible */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Music className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Pregame Music</p>
              <p className="text-xs text-muted-foreground">Get in the zone</p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        {/* Expandable content with Spotify embed */}
        <CollapsibleContent className="bg-card/95 backdrop-blur-md">
          <div className="px-4 pb-3">
            <iframe
              title="Spotify Player"
              src={embedUrl}
              width="100%"
              height={80}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
