import { Music } from 'lucide-react';

interface MusicPlayerProps {
  url: string | null | undefined;
  compact?: boolean;
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
      const encodedUrl = encodeURIComponent(url);
      return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    }
    
    return null;
  } catch {
    return null;
  }
}

function parseMusicUrl(url: string): ParsedMusicUrl | null {
  const spotifyEmbed = parseSpotifyUrl(url);
  if (spotifyEmbed) {
    return { service: 'spotify', embedUrl: spotifyEmbed };
  }
  
  const soundcloudEmbed = parseSoundCloudUrl(url);
  if (soundcloudEmbed) {
    return { service: 'soundcloud', embedUrl: soundcloudEmbed };
  }
  
  return null;
}

export function SpotifyPlayer({ url, compact = false }: MusicPlayerProps) {
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
  
  // SoundCloud needs more height for the visual player
  const height = compact 
    ? (isSpotify ? 80 : 100) 
    : (isSpotify ? 152 : 166);

  return (
    <div className="stat-card overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-full ${bgAccent} flex items-center justify-center`}>
          <Music className={`w-4 h-4 ${accentColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Pregame Music</h3>
          <p className="text-xs text-muted-foreground">
            {isSpotify ? 'Spotify' : 'SoundCloud'} • Get in the zone
          </p>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden">
        <iframe
          title={`${isSpotify ? 'Spotify' : 'SoundCloud'} Player`}
          src={parsed.embedUrl}
          width="100%"
          height={height}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-lg"
        />
      </div>
    </div>
  );
}
