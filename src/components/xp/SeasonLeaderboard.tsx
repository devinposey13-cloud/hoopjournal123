import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, TrendingUp, Star, Medal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LevelBadge } from './LevelBadge';
import { getQuarterDisplayName } from '@/utils/quarterUtils';
import { formatXp } from '@/utils/xpCalculations';
import { cn } from '@/lib/utils';
import type { XpHistory } from '@/types/xp';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  current_level: number;
  current_xp: number;
  games_logged: number;
}

export function SeasonLeaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<XpHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leaderboard' | 'history'>('leaderboard');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch leaderboard (public profiles only)
        const { data: leaderboardData } = await supabase
          .from('player_xp_progress')
          .select(`
            user_id,
            current_level,
            current_xp,
            games_logged
          `)
          .order('current_level', { ascending: false })
          .order('current_xp', { ascending: false })
          .limit(20);

        // Fetch usernames for leaderboard entries
        if (leaderboardData && leaderboardData.length > 0) {
          const userIds = leaderboardData.map(e => e.user_id);
          const { data: profiles } = await supabase
            .from('public_player_profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', userIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
          
          const enrichedLeaderboard = leaderboardData.map(entry => ({
            ...entry,
            username: profileMap.get(entry.user_id)?.display_name || 
                      profileMap.get(entry.user_id)?.username || 
                      'Player',
            avatar_url: profileMap.get(entry.user_id)?.avatar_url || null,
          }));

          setLeaderboard(enrichedLeaderboard);
        }

        // Fetch user's history
        const { data: historyData } = await supabase
          .from('player_xp_history')
          .select('*')
          .eq('user_id', user.id)
          .order('archived_at', { ascending: false });

        setHistory((historyData as XpHistory[]) || []);
      } catch (error) {
        console.error('Error fetching season data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab('leaderboard')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'leaderboard' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </div>
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'history' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            My Seasons
          </div>
        </button>
      </div>

      {tab === 'leaderboard' && (
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No players on the leaderboard yet</p>
              <p className="text-sm">Log a game to join!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <motion.div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border',
                  entry.user_id === user?.id ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Rank */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-slate-400/20 text-slate-400' :
                  index === 2 ? 'bg-orange-500/20 text-orange-500' :
                  'bg-muted text-muted-foreground'
                )}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/50 to-primary overflow-hidden">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-foreground font-bold">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {entry.username}
                    {entry.user_id === user?.id && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatXp(entry.current_xp)} XP • {entry.games_logged} games
                  </p>
                </div>

                {/* Level Badge */}
                <LevelBadge level={entry.current_level} size="md" />
              </motion.div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No season history yet</p>
              <p className="text-sm">Complete a quarter to see your history</p>
            </div>
          ) : (
            history.map((season, index) => (
              <motion.div
                key={season.id}
                className="bg-card rounded-xl border border-border p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LevelBadge level={season.final_level} size="md" />
                    <div>
                      <p className="font-semibold">{getQuarterDisplayName(season.quarter)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatXp(season.total_xp_earned)} XP • {season.games_played} games
                      </p>
                    </div>
                  </div>
                  
                  {season.final_level >= 40 && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-5 h-5 fill-current" />
                      <span className="text-sm font-medium">Elite</span>
                    </div>
                  )}
                </div>
                
                {season.avg_performance && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>Avg Performance: {Math.round(season.avg_performance)}</span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
