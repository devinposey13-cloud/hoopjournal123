import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Target, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, isFuture, parseISO } from 'date-fns';

interface StatsPredictorGameProps {
  onBack: () => void;
}

interface ScheduledGameWithPrediction {
  id: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  prediction?: {
    id: string;
    predicted_points: number;
    predicted_rebounds: number;
    predicted_assists: number;
  };
}

export function StatsPredictorGame({ onBack }: StatsPredictorGameProps) {
  const { user } = useAuth();
  const [upcomingGames, setUpcomingGames] = useState<ScheduledGameWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<ScheduledGameWithPrediction | null>(null);
  const [saving, setSaving] = useState(false);
  const [predictions, setPredictions] = useState({
    points: '',
    rebounds: '',
    assists: '',
  });

  useEffect(() => {
    if (user) {
      fetchUpcomingGames();
    }
  }, [user]);

  const fetchUpcomingGames = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch scheduled games
      const { data: scheduledGames, error: gamesError } = await supabase
        .from('scheduled_games')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (gamesError) throw gamesError;

      // Fetch existing predictions
      const { data: existingPredictions, error: predictionsError } = await supabase
        .from('stats_predictions')
        .select('*')
        .eq('user_id', user.id);

      if (predictionsError) throw predictionsError;

      // Filter for future games and merge with predictions
      const predictionsMap = new Map(
        existingPredictions?.map(p => [p.scheduled_game_id, p]) || []
      );

      const futureGames = (scheduledGames || [])
        .filter(game => isFuture(parseISO(game.date)))
        .map(game => ({
          id: game.id,
          opponent: game.opponent,
          date: game.date,
          time: game.time,
          location: game.location,
          isHome: game.is_home,
          prediction: predictionsMap.get(game.id) ? {
            id: predictionsMap.get(game.id)!.id,
            predicted_points: predictionsMap.get(game.id)!.predicted_points,
            predicted_rebounds: predictionsMap.get(game.id)!.predicted_rebounds,
            predicted_assists: predictionsMap.get(game.id)!.predicted_assists,
          } : undefined,
        }));

      setUpcomingGames(futureGames);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (game: ScheduledGameWithPrediction) => {
    setSelectedGame(game);
    if (game.prediction) {
      setPredictions({
        points: game.prediction.predicted_points.toString(),
        rebounds: game.prediction.predicted_rebounds.toString(),
        assists: game.prediction.predicted_assists.toString(),
      });
    } else {
      setPredictions({ points: '', rebounds: '', assists: '' });
    }
  };

  const handleSubmitPrediction = async () => {
    if (!user || !selectedGame) return;
    
    const points = parseInt(predictions.points) || 0;
    const rebounds = parseInt(predictions.rebounds) || 0;
    const assists = parseInt(predictions.assists) || 0;

    if (points === 0 && rebounds === 0 && assists === 0) {
      toast.error('Please enter at least one prediction');
      return;
    }

    setSaving(true);
    try {
      if (selectedGame.prediction) {
        // Update existing prediction
        const { error } = await supabase
          .from('stats_predictions')
          .update({
            predicted_points: points,
            predicted_rebounds: rebounds,
            predicted_assists: assists,
          })
          .eq('id', selectedGame.prediction.id);

        if (error) throw error;
        toast.success('Prediction updated!');
      } else {
        // Create new prediction
        const { error } = await supabase
          .from('stats_predictions')
          .insert({
            user_id: user.id,
            scheduled_game_id: selectedGame.id,
            predicted_points: points,
            predicted_rebounds: rebounds,
            predicted_assists: assists,
          });

        if (error) throw error;
        toast.success('Prediction saved! Good luck in your game!');
      }

      // Refresh games list
      await fetchUpcomingGames();
      setSelectedGame(null);
      setPredictions({ points: '', rebounds: '', assists: '' });
    } catch (error) {
      console.error('Error saving prediction:', error);
      toast.error('Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Stats Predictor
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">Predict Your Performance</h3>
              <p className="text-muted-foreground">
                Before your next game, predict how many points, rebounds, and assists you&apos;ll get.
                <br />
                Earn points based on how accurate your predictions are!
              </p>
            </div>

            {upcomingGames.length === 0 ? (
              <div className="py-8 space-y-4 text-center">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No Upcoming Games</p>
                  <p className="text-sm text-muted-foreground">
                    Add games to your schedule to start making predictions!
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={onBack}
                >
                  Go to Schedule
                </Button>
              </div>
            ) : selectedGame ? (
              <div className="space-y-6">
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">vs {selectedGame.opponent}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedGame.date), 'EEEE, MMM d')} at {selectedGame.time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedGame.isHome ? '🏠 Home' : '✈️ Away'} • {selectedGame.location}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)}>
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="p-6 space-y-4">
                    <h4 className="font-medium text-center">Your Predictions</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="points">Points</Label>
                        <Input
                          id="points"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={predictions.points}
                          onChange={(e) =>
                            setPredictions({ ...predictions, points: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rebounds">Rebounds</Label>
                        <Input
                          id="rebounds"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={predictions.rebounds}
                          onChange={(e) =>
                            setPredictions({ ...predictions, rebounds: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assists">Assists</Label>
                        <Input
                          id="assists"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={predictions.assists}
                          onChange={(e) =>
                            setPredictions({ ...predictions, assists: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                      onClick={handleSubmitPrediction}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : selectedGame.prediction ? (
                        'Update Prediction'
                      ) : (
                        'Submit Prediction'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Select a game to predict:</p>
                {upcomingGames.map((game) => (
                  <Card
                    key={game.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
                      game.prediction && 'bg-green-500/10 border-green-500/30'
                    )}
                    onClick={() => handleSelectGame(game)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">vs {game.opponent}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(game.date), 'EEEE, MMM d')} at {game.time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {game.isHome ? '🏠 Home' : '✈️ Away'}
                        </p>
                      </div>
                      {game.prediction ? (
                        <div className="text-right">
                          <span className="text-green-500 text-sm flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Predicted
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {game.prediction.predicted_points}pts / {game.prediction.predicted_rebounds}reb / {game.prediction.predicted_assists}ast
                          </p>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline">
                          <Target className="w-4 h-4 mr-1" />
                          Predict
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 text-center">How Scoring Works</h4>
              <p className="text-sm text-muted-foreground text-center mb-3">
                After you log your actual game stats, we&apos;ll compare them to your predictions!
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-green-500/10 text-center">
                  <p className="font-medium text-green-600">Within 10%</p>
                  <p className="text-muted-foreground">+50 pts</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                  <p className="font-medium text-yellow-600">Within 20%</p>
                  <p className="text-muted-foreground">+25 pts</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                  <p className="font-medium text-orange-600">Within 30%</p>
                  <p className="text-muted-foreground">+10 pts</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
