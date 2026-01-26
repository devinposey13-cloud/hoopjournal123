import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoClip } from '@/types/basketball';
import { Loader2, Globe } from 'lucide-react';
import { ClipCard } from './ClipCard';

export function ExploreClips() {
  const [publicClips, setPublicClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicClips();
  }, []);

  const fetchPublicClips = async () => {
    setLoading(true);
    try {
      // Fetch public clips with player info
      const { data: clipsData, error } = await supabase
        .from('video_clips')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get player names for these clips
      const userIds = [...new Set((clipsData || []).map(c => c.user_id))];
      
      let playerMap: Record<string, { name: string; team: string }> = {};
      
      if (userIds.length > 0) {
        const { data: playersData } = await supabase
          .from('player_settings')
          .select('user_id, name, team')
          .in('user_id', userIds);
        
        playerMap = (playersData || []).reduce((acc, p) => {
          acc[p.user_id] = { name: p.name, team: p.team };
          return acc;
        }, {} as Record<string, { name: string; team: string }>);
      }

      // Get signed URLs for clips
      const clipsWithUrls = await Promise.all(
        (clipsData || []).map(async (c) => {
          let url = '';
          
          if (c.file_path) {
            const { data: signedData } = await supabase.storage
              .from('video-clips')
              .createSignedUrl(c.file_path, 3600);
            url = signedData?.signedUrl || '';
          }
          
          const player = playerMap[c.user_id];
          
          return {
            id: c.id,
            title: c.title,
            description: c.description || undefined,
            url,
            date: c.date,
            gameId: c.game_id || undefined,
            isPublic: c.is_public,
            playerName: player?.name || 'Unknown Player',
            playerTeam: player?.team || 'Unknown Team',
          };
        })
      );
      
      setPublicClips(clipsWithUrls);
    } catch (error) {
      console.error('Error fetching public clips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (publicClips.length === 0) {
    return (
      <div className="stat-card text-center py-12">
        <Globe className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No public clips yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to share a highlight!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {publicClips.map((clip) => (
        <ClipCard 
          key={clip.id} 
          clip={clip} 
          showPlayerInfo
        />
      ))}
    </div>
  );
}
