import { useState } from 'react';
import { Music, ChevronUp, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface PersistentMusicBarProps {
  url: string | null | undefined;
}

type MusicService = 'spotify' | 'soundcloud';

interface ParsedMusicUrl {
  service: MusicService;
  embedUrl: string;
}

function parseSpotifyUrl(url: string): string | null {
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
        return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function parseSoundCloudUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('soundcloud.com')) {
      return null;
    }
    
    // SoundCloud URLs: soundcloud.com/artist/track or soundcloud.com/artist/sets/playlist
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      // Encode the original URL for the widget
      const encodedUrl = encodeURIComponent(url);
      return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    }
    
    return null;
  } catch {
    return null;
  }
}

function parseMusicUrl(url: string): ParsedMusicUrl | null {
  // Try Spotify first
  const spotifyEmbed = parseSpotifyUrl(url);
  if (spotifyEmbed) {
    return { service: 'spotify', embedUrl: spotifyEmbed };
  }
  
  // Try SoundCloud
  const soundcloudEmbed = parseSoundCloudUrl(url);
  if (soundcloudEmbed) {
    return { service: 'soundcloud', embedUrl: soundcloudEmbed };
  }
  
  return null;
}

export function PersistentMusicBar({ url }: PersistentMusicBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!url) {
    return null;
  }

  const parsed = parseMusicUrl(url);
  
  if (!parsed) {
    return null;
  }

  const isSpotify = parsed.service === 'spotify';
  const accentColor = isSpotify ? 'text-green-500' : 'text-orange-500';
  const bgAccent = isSpotify ? 'bg-green-500/10' : 'bg-orange-500/10';
  const iframeHeight = isSpotify ? 80 : 166;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Header bar - always visible */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${bgAccent} flex items-center justify-center`}>
              <Music className={`w-4 h-4 ${accentColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium">Pregame Music</p>
              <p className="text-xs text-muted-foreground">
                {isSpotify ? 'Spotify' : 'SoundCloud'} • Get in the zone
              </p>
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
        
        {/* Expandable content with music embed */}
        <CollapsibleContent className="bg-card/95 backdrop-blur-md">
          <div className="px-4 pb-3">
            <iframe
              title={`${parsed.service === 'spotify' ? 'Spotify' : 'SoundCloud'} Player`}
              src={parsed.embedUrl}
              width="100%"
              height={iframeHeight}
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
