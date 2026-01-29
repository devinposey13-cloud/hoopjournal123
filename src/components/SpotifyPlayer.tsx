import { Music } from 'lucide-react';

interface SpotifyPlayerProps {
  url: string | null | undefined;
  compact?: boolean;
}

function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  try {
    // Handle Spotify URLs like:
    // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
    // https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('spotify.com')) {
      return null;
    }
    
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const type = pathParts[0]; // playlist, track, album, episode, show
      const id = pathParts[1].split('?')[0]; // Remove query params
      
      if (['playlist', 'track', 'album', 'episode', 'show'].includes(type) && id) {
        return { type, id };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export function SpotifyPlayer({ url, compact = false }: SpotifyPlayerProps) {
  if (!url) {
    return null;
  }

  const parsed = parseSpotifyUrl(url);
  
  if (!parsed) {
    return null;
  }

  // Build the Spotify embed URL
  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=0`;

  const height = compact ? 80 : 152;

  return (
    <div className="stat-card overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
          <Music className="w-4 h-4 text-green-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Pregame Music</h3>
          <p className="text-xs text-muted-foreground">Get in the zone</p>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden">
        <iframe
          title="Spotify Player"
          src={embedUrl}
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
