import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, Target, Shield, Zap, Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';

interface ParentDashboardData {
  profile: {
    id: string;
    name: string;
    team: string;
    position: string;
    number: number;
    height: string;
    grade: string;
    avatar_url: string | null;
  };
  games: Array<{
    id: string;
    date: string;
    opponent: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
    minutes_played: number;
    fg_made: number;
    fg_attempted: number;
    three_pt_made: number;
    three_pt_attempted: number;
    ft_made: number;
    ft_attempted: number;
    is_win: boolean;
    final_score_us: number | null;
    final_score_them: number | null;
  }>;
  milestones: Array<{
    id: string;
    earned_at: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
  }>;
  xp: {
    current_xp: number;
    current_level: number;
    peak_level: number;
    games_logged: number;
    quarter: string;
  } | null;
}

export default function ParentDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError('No token provided');
        setLoading(false);
        return;
      }

      const { data: result, error: rpcError } = await supabase.rpc('get_parent_dashboard_data', {
        p_token: token,
      });

      if (rpcError) {
        setError('Failed to load dashboard');
        setLoading(false);
        return;
      }

      const parsed = result as any;
      if (parsed?.error === 'invalid_token') {
        setError('This link is invalid or has been deactivated.');
        setLoading(false);
        return;
      }
      if (parsed?.error === 'profile_not_found') {
        setError('Player profile not found.');
        setLoading(false);
        return;
      }

      setData(parsed as ParentDashboardData);
      setLoading(false);
    }

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Dashboard Unavailable</h2>
            <p className="text-muted-foreground text-sm">{error || 'Something went wrong.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, games, milestones, xp } = data;

  // Compute season averages
  const gamesCount = games.length;
  const avg = (key: keyof typeof games[0]) =>
    gamesCount > 0
      ? (games.reduce((sum, g) => sum + (Number(g[key]) || 0), 0) / gamesCount).toFixed(1)
      : '0.0';

  const totalFgMade = games.reduce((s, g) => s + g.fg_made, 0);
  const totalFgAtt = games.reduce((s, g) => s + g.fg_attempted, 0);
  const totalThreeMade = games.reduce((s, g) => s + g.three_pt_made, 0);
  const totalThreeAtt = games.reduce((s, g) => s + g.three_pt_attempted, 0);
  const totalFtMade = games.reduce((s, g) => s + g.ft_made, 0);
  const totalFtAtt = games.reduce((s, g) => s + g.ft_attempted, 0);
  const fgPct = totalFgAtt > 0 ? ((totalFgMade / totalFgAtt) * 100).toFixed(1) : '0.0';
  const threePct = totalThreeAtt > 0 ? ((totalThreeMade / totalThreeAtt) * 100).toFixed(1) : '0.0';
  const ftPct = totalFtAtt > 0 ? ((totalFtMade / totalFtAtt) * 100).toFixed(1) : '0.0';
  const wins = games.filter((g) => g.is_win).length;

  const rarityColors: Record<string, string> = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    rare: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    epic: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    legendary: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={hoopJournalLogo} alt="Hoop Journal" className="h-8 w-8 rounded" />
          <span className="font-semibold text-sm">Hoop Journal</span>
          <Badge variant="secondary" className="ml-auto text-xs">Parent View</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Player Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-lg font-bold bg-primary/20 text-primary">
                  {profile.name?.charAt(0) || '#'}
                  {profile.number}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <p className="text-muted-foreground text-sm">
                  #{profile.number} · {profile.position} · {profile.team}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.height} · {profile.grade}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* XP & Level */}
        {xp && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{xp.current_level}</div>
                  <div className="text-xs text-muted-foreground">Current Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{xp.current_xp.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total XP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{xp.games_logged}</div>
                  <div className="text-xs text-muted-foreground">Games Logged</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Season Averages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Season Averages
              <Badge variant="secondary" className="ml-auto text-xs">{gamesCount} games · {wins}W-{gamesCount - wins}L</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: 'PTS', value: avg('points') },
                { label: 'REB', value: avg('rebounds') },
                { label: 'AST', value: avg('assists') },
                { label: 'STL', value: avg('steals') },
                { label: 'BLK', value: avg('blocks') },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: 'FG%', value: `${fgPct}%` },
                { label: '3P%', value: `${threePct}%` },
                { label: 'FT%', value: `${ftPct}%` },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <div className="text-lg font-semibold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Games */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No games logged yet.</p>
            ) : (
              games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={game.is_win ? 'default' : 'secondary'}
                      className={`text-xs w-6 h-6 flex items-center justify-center p-0 ${
                        game.is_win ? 'bg-emerald-500/80' : ''
                      }`}
                    >
                      {game.is_win ? 'W' : 'L'}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">vs {game.opponent}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(game.date), 'MMM d, yyyy')}
                        {game.final_score_us != null && game.final_score_them != null && (
                          <span className="ml-2">
                            {game.final_score_us}-{game.final_score_them}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{game.points}pts</span>
                    <span>{game.rebounds}reb</span>
                    <span>{game.assists}ast</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Milestones */}
        {milestones.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Milestones Earned
                <Badge variant="secondary" className="ml-auto text-xs">{milestones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      rarityColors[m.rarity] || rarityColors.common
                    }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-muted-foreground">
          Powered by <span className="font-semibold">Hoop Journal</span>
        </div>
      </div>
    </div>
  );
}
