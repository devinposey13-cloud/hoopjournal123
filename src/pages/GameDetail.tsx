import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GameStats } from '@/types/basketball';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trophy, Target, Repeat, Zap, Shield, HandMetal, Clock, AlertCircle } from 'lucide-react';

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [game, setGame] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Game not found');
          setLoading(false);
          return;
        }

        setGame({
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
        });
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchGame();
    }
  }, [id, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="stat-card text-center py-16">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">{error || 'Game not found'}</p>
            <p className="text-muted-foreground mb-6">
              This game may not have been recorded yet. Log your stats after playing!
            </p>
            <Link to="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fgPct = game.fgAttempted > 0 ? Math.round((game.fgMade / game.fgAttempted) * 100) : 0;
  const threePct = game.threePtAttempted > 0 ? Math.round((game.threePtMade / game.threePtAttempted) * 100) : 0;
  const ftPct = game.ftAttempted > 0 ? Math.round((game.ftMade / game.ftAttempted) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-bold uppercase',
                  game.isWin
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                )}
              >
                {game.isWin ? 'Victory' : 'Defeat'}
              </div>
              <span className="text-muted-foreground">
                {format(new Date(game.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <h1 className="text-3xl font-bold">vs {game.opponent}</h1>
          </div>
        </div>

        {/* Points Highlight */}
        <div className="stat-card mb-6 text-center py-8 gradient-primary rounded-xl">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-primary-foreground/80" />
          <p className="text-6xl font-bold text-primary-foreground">{game.points}</p>
          <p className="text-primary-foreground/80 uppercase tracking-wider text-sm mt-1">Points Scored</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatBox icon={Repeat} label="Rebounds" value={game.rebounds} />
          <StatBox icon={Zap} label="Assists" value={game.assists} />
          <StatBox icon={Shield} label="Steals" value={game.steals} />
          <StatBox icon={HandMetal} label="Blocks" value={game.blocks} />
          <StatBox icon={Clock} label="Minutes" value={game.minutesPlayed} />
        </div>

        {/* Shooting Stats */}
        <div className="stat-card mb-6">
          <h2 className="text-lg font-semibold mb-4">Shooting Performance</h2>
          <div className="grid grid-cols-3 gap-6">
            <ShootingStatBox
              label="Field Goals"
              made={game.fgMade}
              attempted={game.fgAttempted}
              percentage={fgPct}
            />
            <ShootingStatBox
              label="3-Pointers"
              made={game.threePtMade}
              attempted={game.threePtAttempted}
              percentage={threePct}
            />
            <ShootingStatBox
              label="Free Throws"
              made={game.ftMade}
              attempted={game.ftAttempted}
              percentage={ftPct}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="stat-card">
          <h2 className="text-lg font-semibold mb-4">Game Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Turnovers</p>
              <p className="text-2xl font-bold">{game.turnovers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Efficiency</p>
              <p className="text-2xl font-bold">
                {game.points + game.rebounds + game.assists + game.steals + game.blocks - game.turnovers}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">True Shooting</p>
              <p className="text-2xl font-bold">
                {game.fgAttempted + (0.44 * game.ftAttempted) > 0
                  ? Math.round((game.points / (2 * (game.fgAttempted + 0.44 * game.ftAttempted))) * 100)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Points/Min</p>
              <p className="text-2xl font-bold">
                {game.minutesPlayed > 0 ? (game.points / game.minutesPlayed).toFixed(1) : '0.0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card text-center py-6">
      <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function ShootingStatBox({
  label,
  made,
  attempted,
  percentage,
}: {
  label: string;
  made: number;
  attempted: number;
  percentage: number;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold">
        {made}/{attempted}
      </p>
      <div className="mt-2">
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm font-medium mt-1">{percentage}%</p>
      </div>
    </div>
  );
}
