import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GameStats, VideoClip, PlayerProfile, SeasonStats, ScheduledGame, Season } from '@/types/basketball';
import { toast } from 'sonner';

const defaultProfile: PlayerProfile = {
  name: 'Player Name',
  team: 'Team Name',
  position: 'Guard',
  number: 23,
  height: "5'8\"",
  grade: '8th Grade',
  username: undefined,
  displayName: undefined,
  isProfilePublic: false,
};

export function useCloudData() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameStats[]>([]);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [schedule, setSchedule] = useState<ScheduledGame[]>([]);
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching seasons:', error);
      return [];
    }
    
    const mappedSeasons: Season[] = (data || []).map(s => ({
      id: s.id,
      name: s.name,
      startDate: s.start_date || undefined,
      endDate: s.end_date || undefined,
      isActive: s.is_active,
      createdAt: s.created_at,
    }));
    
    setSeasons(mappedSeasons);
    
    // Set active season
    const active = mappedSeasons.find(s => s.isActive) || mappedSeasons[0] || null;
    setActiveSeason(active);
    
    return mappedSeasons;
  }, [user]);

  // Fetch all data when user is authenticated
  const fetchData = useCallback(async (seasonId?: string) => {
    if (!user) {
      setGames([]);
      setClips([]);
      setSchedule([]);
      setProfile(defaultProfile);
      setSeasons([]);
      setActiveSeason(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch seasons first
      const fetchedSeasons = await fetchSeasons();
      const currentSeasonId = seasonId || fetchedSeasons.find(s => s.isActive)?.id || fetchedSeasons[0]?.id;

      // Fetch games (filtered by season if one is active)
      let gamesQuery = supabase
        .from('games')
        .select('*')
        .order('date', { ascending: false });
      
      if (currentSeasonId) {
        gamesQuery = gamesQuery.eq('season_id', currentSeasonId);
      }

      const { data: gamesData, error: gamesError } = await gamesQuery;

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
        fouls: g.fouls ?? 0,
        minutesPlayed: g.minutes_played,
        fgMade: g.fg_made,
        fgAttempted: g.fg_attempted,
        threePtMade: g.three_pt_made,
        threePtAttempted: g.three_pt_attempted,
        ftMade: g.ft_made,
        ftAttempted: g.ft_attempted,
        isWin: g.is_win,
      })) || []);

      // Fetch scheduled games (filtered by season)
      let scheduleQuery = supabase
        .from('scheduled_games')
        .select('*')
        .order('date', { ascending: true });
      
      if (currentSeasonId) {
        scheduleQuery = scheduleQuery.eq('season_id', currentSeasonId);
      }

      const { data: scheduleData, error: scheduleError } = await scheduleQuery;

      if (scheduleError) throw scheduleError;
      
      setSchedule(scheduleData?.map(s => ({
        id: s.id,
        date: s.date,
        time: s.time,
        opponent: s.opponent,
        location: s.location,
        isHome: s.is_home,
        notes: s.notes || undefined,
        tournament: (s as any).tournament || undefined,
      })) || []);

      // Fetch video clips (filtered by user_id and season)
      // IMPORTANT: Filter by user_id to only get the current user's clips
      let clipsQuery = supabase
        .from('video_clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (currentSeasonId) {
        clipsQuery = clipsQuery.eq('season_id', currentSeasonId);
      }

      const { data: clipsData, error: clipsError } = await clipsQuery;

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

      // Fetch player settings for the current user
      const { data: settingsData, error: settingsError } = await (supabase as any)
        .from('player_settings')
        .select('*')
        .eq('user_id', user.id)
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
          username: settingsData.username || undefined,
          displayName: settingsData.display_name || undefined,
          isProfilePublic: settingsData.is_profile_public ?? false,
          themeMusicUrl: settingsData.theme_music_url || undefined,
          instagramUrl: settingsData.instagram_url || undefined,
          avatarSkippedAt: settingsData.avatar_skipped_at || undefined,
          // Onboarding fields
          courtRole: settingsData.court_role || undefined,
          playingLevel: settingsData.playing_level || undefined,
          seasonGoals: settingsData.season_goals || undefined,
          parentEmail: settingsData.parent_email || undefined,
          onboardingCompletedAt: settingsData.onboarding_completed_at || undefined,
          // Notification preferences
          receiveGameSummaries: settingsData.receive_game_summaries ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, fetchSeasons]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create season
  const createSeason = async (name: string) => {
    if (!user) return null;

    try {
      // Set all other seasons to inactive
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { data, error } = await supabase
        .from('seasons')
        .insert({
          user_id: user.id,
          name,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newSeason: Season = {
        id: data.id,
        name: data.name,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        isActive: data.is_active,
        createdAt: data.created_at,
      };

      setSeasons(prev => [newSeason, ...prev.map(s => ({ ...s, isActive: false }))]);
      setActiveSeason(newSeason);
      
      // Refetch data for the new season (will be empty)
      await fetchData(newSeason.id);
      
      toast.success(`Season "${name}" created!`);
      return newSeason;
    } catch (error) {
      console.error('Error creating season:', error);
      toast.error('Failed to create season');
      return null;
    }
  };

  // Switch season
  const switchSeason = async (seasonId: string) => {
    if (!user) return;

    try {
      // Update active status in database
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('user_id', user.id);

      await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId);

      // Update local state
      const newActive = seasons.find(s => s.id === seasonId);
      if (newActive) {
        setSeasons(prev => prev.map(s => ({
          ...s,
          isActive: s.id === seasonId,
        })));
        setActiveSeason({ ...newActive, isActive: true });
        
        // Refetch data for the selected season
        await fetchData(seasonId);
        
        toast.success(`Switched to ${newActive.name}`);
      }
    } catch (error) {
      console.error('Error switching season:', error);
      toast.error('Failed to switch season');
    }
  };

  // Delete season and all associated data
  const deleteSeason = async (seasonId: string) => {
    if (!user) return false;

    try {
      const seasonToDelete = seasons.find(s => s.id === seasonId);
      if (!seasonToDelete) return false;

      // Delete all associated data first (due to foreign key constraints)
      // Delete scheduled games
      await supabase
        .from('scheduled_games')
        .delete()
        .eq('season_id', seasonId);

      // Delete games
      await supabase
        .from('games')
        .delete()
        .eq('season_id', seasonId);

      // Delete video clips
      await supabase
        .from('video_clips')
        .delete()
        .eq('season_id', seasonId);

      // Delete player milestones
      await supabase
        .from('player_milestones')
        .delete()
        .eq('season_id', seasonId);

      // Delete player badges
      await supabase
        .from('player_badges')
        .delete()
        .eq('season_id', seasonId);

      // Finally delete the season itself
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId);

      if (error) throw error;

      // Update local state
      const remainingSeasons = seasons.filter(s => s.id !== seasonId);
      setSeasons(remainingSeasons);

      // If we deleted the active season, switch to another one
      if (activeSeason?.id === seasonId) {
        const newActive = remainingSeasons[0] || null;
        if (newActive) {
          await switchSeason(newActive.id);
        } else {
          setActiveSeason(null);
          setGames([]);
          setSchedule([]);
          setClips([]);
        }
      }

      toast.success(`Season "${seasonToDelete.name}" deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting season:', error);
      toast.error('Failed to delete season');
      return false;
    }
  };

  // Add game (now with season_id)
  const addGame = async (game: Omit<GameStats, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          user_id: user.id,
          season_id: activeSeason?.id || null,
          date: game.date,
          opponent: game.opponent,
          points: game.points,
          rebounds: game.rebounds,
          assists: game.assists,
          steals: game.steals,
          blocks: game.blocks,
          turnovers: game.turnovers,
          fouls: game.fouls ?? 0,
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
        fouls: data.fouls ?? 0,
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

  // Add scheduled game (now with season_id)
  const addScheduledGame = async (game: Omit<ScheduledGame, 'id'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('scheduled_games')
        .insert({
          user_id: user.id,
          season_id: activeSeason?.id || null,
          date: game.date,
          time: game.time,
          opponent: game.opponent,
          location: game.location,
          is_home: game.isHome,
          notes: game.notes,
          // Auto-fill tag with opponent if not provided
          tournament: game.tournament || game.opponent,
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
        tournament: (data as any).tournament || undefined,
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

  // Bulk import scheduled games (for RSS import)
  const bulkImportScheduledGames = async (games: Omit<ScheduledGame, 'id'>[]) => {
    if (!user || games.length === 0) return [];

    try {
      const inserts = games.map((game) => ({
        user_id: user.id,
        season_id: activeSeason?.id || null,
        date: game.date,
        time: game.time,
        opponent: game.opponent,
        location: game.location,
        is_home: game.isHome,
        notes: game.notes,
        // Auto-fill tag with opponent if not provided
        tournament: game.tournament || game.opponent,
      }));

      const { data, error } = await supabase
        .from('scheduled_games')
        .insert(inserts)
        .select();

      if (error) throw error;

      const newGames: ScheduledGame[] = (data || []).map((g) => ({
        id: g.id,
        date: g.date,
        time: g.time,
        opponent: g.opponent,
        location: g.location,
        isHome: g.is_home,
        notes: g.notes || undefined,
        tournament: (g as any).tournament || undefined,
      }));

      setSchedule((prev) =>
        [...prev, ...newGames].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      );

      return newGames;
    } catch (error) {
      console.error('Error bulk importing games:', error);
      toast.error('Failed to import games');
      return [];
    }
  };

  // Update scheduled game
  const updateScheduledGame = async (id: string, updates: Partial<Omit<ScheduledGame, 'id'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.opponent !== undefined) dbUpdates.opponent = updates.opponent;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.isHome !== undefined) dbUpdates.is_home = updates.isHome;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.tournament !== undefined) dbUpdates.tournament = updates.tournament;

      const { data, error } = await supabase
        .from('scheduled_games')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedGame: ScheduledGame = {
        id: data.id,
        date: data.date,
        time: data.time,
        opponent: data.opponent,
        location: data.location,
        isHome: data.is_home,
        notes: data.notes || undefined,
        tournament: (data as any).tournament || undefined,
      };

      setSchedule(prev => prev.map(g => g.id === id ? updatedGame : g).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      
      toast.success('Game updated!');
      return updatedGame;
    } catch (error) {
      console.error('Error updating scheduled game:', error);
      toast.error('Failed to update game');
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

  // Add clip (now with season_id and is_public)
  const addClip = async (file: File, title: string, description?: string, isPublic?: boolean) => {
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
          season_id: activeSeason?.id || null,
          title,
          description,
          file_path: filePath,
          date: new Date().toISOString(),
          is_public: isPublic ?? false,
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
        isPublic: data.is_public,
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
      const { error } = await (supabase as any)
        .from('player_settings')
        .upsert(
          {
            user_id: user.id,
            name: updates.name ?? profile.name,
            team: updates.team ?? profile.team,
            position: updates.position ?? profile.position,
            number: updates.number ?? profile.number,
            height: updates.height ?? profile.height,
            grade: updates.grade ?? profile.grade,
            avatar_url: updates.avatar ?? profile.avatar ?? null,
            username: updates.username ?? profile.username ?? null,
            display_name: updates.displayName ?? profile.displayName ?? null,
            is_profile_public: updates.isProfilePublic ?? profile.isProfilePublic ?? false,
            theme_music_url: updates.themeMusicUrl ?? profile.themeMusicUrl ?? null,
            instagram_url: updates.instagramUrl ?? profile.instagramUrl ?? null,
            avatar_skipped_at: updates.avatarSkippedAt ?? profile.avatarSkippedAt ?? null,
            // Onboarding fields
            court_role: updates.courtRole ?? profile.courtRole ?? null,
            playing_level: updates.playingLevel ?? profile.playingLevel ?? null,
            season_goals: updates.seasonGoals ?? profile.seasonGoals ?? null,
            parent_email: updates.parentEmail ?? profile.parentEmail ?? null,
            onboarding_completed_at: updates.onboardingCompletedAt ?? profile.onboardingCompletedAt ?? null,
            // Notification preferences
            receive_game_summaries: updates.receiveGameSummaries ?? profile.receiveGameSummaries ?? false,
          },
          { onConflict: 'user_id' }
        );

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
    seasons,
    activeSeason,
    loading,
    seasonStats: calculateSeasonStats(),
    addGame,
    deleteGame,
    addScheduledGame,
    updateScheduledGame,
    deleteScheduledGame,
    bulkImportScheduledGames,
    addClip,
    deleteClip,
    updateProfile,
    uploadAvatar,
    createSeason,
    switchSeason,
    deleteSeason,
    refetch: fetchData,
  };
}
