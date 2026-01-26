import { useState, useEffect } from 'react';
import { GameStats, VideoClip, PlayerProfile, SeasonStats } from '@/types/basketball';

const STORAGE_KEYS = {
  GAMES: 'basketball_games',
  CLIPS: 'basketball_clips',
  PROFILE: 'basketball_profile',
};

const defaultProfile: PlayerProfile = {
  name: 'Player Name',
  team: 'Team Name',
  position: 'Guard',
  number: 23,
  height: "5'8\"",
  grade: '8th Grade',
};

export function useBasketballData() {
  const [games, setGames] = useState<GameStats[]>([]);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedGames = localStorage.getItem(STORAGE_KEYS.GAMES);
    const savedClips = localStorage.getItem(STORAGE_KEYS.CLIPS);
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);

    if (savedGames) setGames(JSON.parse(savedGames));
    if (savedClips) setClips(JSON.parse(savedClips));
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  // Save games to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  }, [games]);

  // Save clips to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIPS, JSON.stringify(clips));
  }, [clips]);

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  const addGame = (game: Omit<GameStats, 'id'>) => {
    const newGame: GameStats = {
      ...game,
      id: crypto.randomUUID(),
    };
    setGames((prev) => [newGame, ...prev]);
    return newGame;
  };

  const updateGame = (id: string, updates: Partial<GameStats>) => {
    setGames((prev) =>
      prev.map((game) => (game.id === id ? { ...game, ...updates } : game))
    );
  };

  const deleteGame = (id: string) => {
    setGames((prev) => prev.filter((game) => game.id !== id));
  };

  const addClip = (clip: Omit<VideoClip, 'id'>) => {
    const newClip: VideoClip = {
      ...clip,
      id: crypto.randomUUID(),
    };
    setClips((prev) => [newClip, ...prev]);
    return newClip;
  };

  const deleteClip = (id: string) => {
    setClips((prev) => prev.filter((clip) => clip.id !== id));
  };

  const updateProfile = (updates: Partial<PlayerProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

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
    profile,
    seasonStats: calculateSeasonStats(),
    addGame,
    updateGame,
    deleteGame,
    addClip,
    deleteClip,
    updateProfile,
  };
}
