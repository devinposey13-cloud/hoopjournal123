import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GameStats, VideoClip, PlayerProfile, SeasonStats, ScheduledGame } from '@/types/basketball';
import { toast } from 'sonner';

const defaultProfile: PlayerProfile = {
  name: 'Player Name',
  team: 'Team Name',
  position: 'Guard',
  number: 23,
  height: "5'8\"",
  grade: '8th Grade',
};

export function useCloudData() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameStats[]>([]);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [schedule, setSchedule] = useState<ScheduledGame[]>([]);
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  // Fetch all data when user is authenticated
  const fetchData = useCallback(async () => {
    if (!user) {
      setGames([]);
      setClips([]);
      setSchedule([]);
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('date', { ascending: false });

      if (gamesError) throw gamesError;
      
      setGames(gamesData?.map(g => ({
        id: g.id,
        date: g.date,
        opponent: g.opponent,
        points: g.points,
        rebounds: g.rebounds,
        assists: g.assists,
        steals: g.steals,
        blocks: g.blocks,
        turnovers: g.turnovers,
        minutesPlayed: g.minutes_played,
        fgMade: g.fg_made,
        fgAttempted: g.fg_attempted,
        threePtMade: g.three_pt_made,
        threePtAttempted: g.three_pt_attempted,
        ftMade: g.ft_made,
        ftAttempted: g.ft_attempted,
        isWin: g.is_win,
      })) || []);

      // Fetch scheduled games
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('scheduled_games')
        .select('*')
        .order('date', { ascending: true });

      if (scheduleError) throw scheduleError;
      
      setSchedule(scheduleData?.map(s => ({
        id: s.id,
        date: s.date,
        time: s.time,
        opponent: s.opponent,
        location: s.location,
        isHome: s.is_home,
        notes: s.notes || undefined,
      })) || []);

      // Fetch video clips
      const { data: clipsData, error: clipsError } = await supabase
        .from('video_clips')
        .select('*')
        .order('created_at', { ascending: false });

      if (clipsError) throw clipsError;
      
      // Get signed URLs for clips
      const clipsWithUrls = await Promise.all(
        (clipsData || []).map(async (c) => {
          let url = '';
          let thumbnail = '';
          
          if (c.file_path) {
            const { data: signedData } = await supabase.storage
              .from('video-clips')
              .createSignedUrl(c.file_path, 3600);
            url = signedData?.signedUrl || '';
          }
          
          return {
            id: c.id,
            title: c.title,
            description: c.description || undefined,
            url,
            thumbnail,
            date: c.date,
            gameId: c.game_id || undefined,
          };
        })
      );
      
      setClips(clipsWithUrls);

      // Fetch player settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('player_settings')
        .select('*')
        .maybeSingle();

      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setProfile({
          name: settingsData.name,
          team: settingsData.team,
          position: settingsData.position,
          number: settingsData.number,
          height: settingsData.height,
          grade: settingsData.grade,
          avatar: settingsData.avatar_url || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add game
  const addGame = async (game: Omit<GameStats, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          user_id: user.id,
          date: game.date,
          opponent: game.opponent,
          points: game.points,
          rebounds: game.rebounds,
          assists: game.assists,
          steals: game.steals,
          blocks: game.blocks,
          turnovers: game.turnovers,
          minutes_played: game.minutesPlayed,
          fg_made: game.fgMade,
          fg_attempted: game.fgAttempted,
          three_pt_made: game.threePtMade,
          three_pt_attempted: game.threePtAttempted,
          ft_made: game.ftMade,
          ft_attempted: game.ftAttempted,
          is_win: game.isWin,
        })
        .select()
        .single();

      if (error) throw error;

      const newGame: GameStats = {
        id: data.id,
        date: data.date,
        opponent: data.opponent,
        points: data.points,
        rebounds: data.rebounds,
        assists: data.assists,
        steals: data.steals,
        blocks: data.blocks,
        turnovers: data.turnovers,
        minutesPlayed: data.minutes_played,
        fgMade: data.fg_made,
        fgAttempted: data.fg_attempted,
        threePtMade: data.three_pt_made,
        threePtAttempted: data.three_pt_attempted,
        ftMade: data.ft_made,
        ftAttempted: data.ft_attempted,
        isWin: data.is_win,
      };

      setGames(prev => [newGame, ...prev]);
      toast.success('Game saved!');
      return newGame;
    } catch (error) {
      console.error('Error adding game:', error);
      toast.error('Failed to save game');
      return null;
    }
  };

  // Delete game
  const deleteGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGames(prev => prev.filter(g => g.id !== id));
      toast.success('Game deleted');
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error('Failed to delete game');
    }
  };

  // Add scheduled game
  const addScheduledGame = async (game: Omit<ScheduledGame, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('scheduled_games')
        .insert({
          user_id: user.id,
          date: game.date,
          time: game.time,
          opponent: game.opponent,
          location: game.location,
          is_home: game.isHome,
          notes: game.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newGame: ScheduledGame = {
        id: data.id,
        date: data.date,
        time: data.time,
        opponent: data.opponent,
        location: data.location,
        isHome: data.is_home,
        notes: data.notes || undefined,
      };

      setSchedule(prev => [...prev, newGame].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      toast.success('Game scheduled!');
      return newGame;
    } catch (error) {
      console.error('Error scheduling game:', error);
      toast.error('Failed to schedule game');
      return null;
    }
  };

  // Delete scheduled game
  const deleteScheduledGame = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedule(prev => prev.filter(g => g.id !== id));
      toast.success('Game removed from schedule');
    } catch (error) {
      console.error('Error deleting scheduled game:', error);
      toast.error('Failed to remove game');
    }
  };

  // Add clip
  const addClip = async (file: File, title: string, description?: string) => {
    if (!user) return null;

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('video-clips')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error } = await supabase
        .from('video_clips')
        .insert({
          user_id: user.id,
          title,
          description,
          file_path: filePath,
          date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from('video-clips')
        .createSignedUrl(filePath, 3600);

      const newClip: VideoClip = {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        url: signedData?.signedUrl || '',
        date: data.date,
      };

      setClips(prev => [newClip, ...prev]);
      toast.success('Clip uploaded!');
      return newClip;
    } catch (error) {
      console.error('Error uploading clip:', error);
      toast.error('Failed to upload clip');
      return null;
    }
  };

  // Delete clip
  const deleteClip = async (id: string) => {
    try {
      // Get file path first
      const { data: clipData } = await supabase
        .from('video_clips')
        .select('file_path')
        .eq('id', id)
        .single();

      if (clipData?.file_path) {
        await supabase.storage
          .from('video-clips')
          .remove([clipData.file_path]);
      }

      const { error } = await supabase
        .from('video_clips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClips(prev => prev.filter(c => c.id !== id));
      toast.success('Clip deleted');
    } catch (error) {
      console.error('Error deleting clip:', error);
      toast.error('Failed to delete clip');
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<PlayerProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('player_settings')
        .upsert({
          user_id: user.id,
          name: updates.name ?? profile.name,
          team: updates.team ?? profile.team,
          position: updates.position ?? profile.position,
          number: updates.number ?? profile.number,
          height: updates.height ?? profile.height,
          grade: updates.grade ?? profile.grade,
          avatar_url: updates.avatar ?? profile.avatar ?? null,
        });

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...updates }));
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from('avatars').remove([filePath]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Update profile with new avatar URL
      await updateProfile({ avatar: avatarUrl });

      return avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
      return null;
    }
  };

  // Calculate season stats
  const calculateSeasonStats = (): SeasonStats => {
    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        avgPoints: 0,
        avgRebounds: 0,
        avgAssists: 0,
        avgSteals: 0,
        avgBlocks: 0,
        fgPercentage: 0,
        threePtPercentage: 0,
        ftPercentage: 0,
      };
    }

    const totals = games.reduce(
      (acc, game) => ({
        points: acc.points + game.points,
        rebounds: acc.rebounds + game.rebounds,
        assists: acc.assists + game.assists,
        steals: acc.steals + game.steals,
        blocks: acc.blocks + game.blocks,
        fgMade: acc.fgMade + game.fgMade,
        fgAttempted: acc.fgAttempted + game.fgAttempted,
        threePtMade: acc.threePtMade + game.threePtMade,
        threePtAttempted: acc.threePtAttempted + game.threePtAttempted,
        ftMade: acc.ftMade + game.ftMade,
        ftAttempted: acc.ftAttempted + game.ftAttempted,
        wins: acc.wins + (game.isWin ? 1 : 0),
      }),
      {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fgMade: 0,
        fgAttempted: 0,
        threePtMade: 0,
        threePtAttempted: 0,
        ftMade: 0,
        ftAttempted: 0,
        wins: 0,
      }
    );

    const gamesPlayed = games.length;

    return {
      gamesPlayed,
      wins: totals.wins,
      losses: gamesPlayed - totals.wins,
      avgPoints: Math.round((totals.points / gamesPlayed) * 10) / 10,
      avgRebounds: Math.round((totals.rebounds / gamesPlayed) * 10) / 10,
      avgAssists: Math.round((totals.assists / gamesPlayed) * 10) / 10,
      avgSteals: Math.round((totals.steals / gamesPlayed) * 10) / 10,
      avgBlocks: Math.round((totals.blocks / gamesPlayed) * 10) / 10,
      fgPercentage:
        totals.fgAttempted > 0
          ? Math.round((totals.fgMade / totals.fgAttempted) * 1000) / 10
          : 0,
      threePtPercentage:
        totals.threePtAttempted > 0
          ? Math.round((totals.threePtMade / totals.threePtAttempted) * 1000) / 10
          : 0,
      ftPercentage:
        totals.ftAttempted > 0
          ? Math.round((totals.ftMade / totals.ftAttempted) * 1000) / 10
          : 0,
    };
  };

  return {
    games,
    clips,
    schedule,
    profile,
    loading,
    seasonStats: calculateSeasonStats(),
    addGame,
    deleteGame,
    addScheduledGame,
    deleteScheduledGame,
    addClip,
    deleteClip,
    updateProfile,
    uploadAvatar,
    refetch: fetchData,
  };
}
