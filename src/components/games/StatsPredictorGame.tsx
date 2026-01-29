import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Target, Check, Loader2, History, Trophy, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

interface PredictionHistory {
  id: string;
  opponent: string;
  date: string;
  predicted_points: number;
  predicted_rebounds: number;
  predicted_assists: number;
  actual_points: number | null;
  actual_rebounds: number | null;
  actual_assists: number | null;
  accuracy_score: number | null;
  points_earned: number;
  is_resolved: boolean;
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
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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

      // Fetch all predictions
      const { data: allPredictions, error: predictionsError } = await supabase
        .from('stats_predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (predictionsError) throw predictionsError;

      // Create maps for easy lookup
      const gamesMap = new Map(
        (scheduledGames || []).map(g => [g.id, g])
      );
      const predictionsMap = new Map(
        (allPredictions || []).map(p => [p.scheduled_game_id, p])
      );

      // Filter for future games and merge with predictions
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

      // Build prediction history (past predictions)
      const predictionHistory: PredictionHistory[] = (allPredictions || [])
        .filter(p => {
          const game = gamesMap.get(p.scheduled_game_id);
          return game && !isFuture(parseISO(game.date));
        })
        .map(p => {
          const game = gamesMap.get(p.scheduled_game_id)!;
          return {
            id: p.id,
            opponent: game.opponent,
            date: game.date,
            predicted_points: p.predicted_points,
            predicted_rebounds: p.predicted_rebounds,
            predicted_assists: p.predicted_assists,
            actual_points: p.actual_points,
            actual_rebounds: p.actual_rebounds,
            actual_assists: p.actual_assists,
            accuracy_score: p.accuracy_score ? Number(p.accuracy_score) : null,
            points_earned: p.points_earned || 0,
            is_resolved: p.is_resolved,
          };
        });

      setUpcomingGames(futureGames);
      setHistory(predictionHistory);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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

      // Refresh data
      await fetchData();
      setSelectedGame(null);
      setPredictions({ points: '', rebounds: '', assists: '' });
    } catch (error) {
      console.error('Error saving prediction:', error);
      toast.error('Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  const getAccuracyColor = (accuracy: number | null) => {
    if (accuracy === null) return 'text-muted-foreground';
    if (accuracy >= 90) return 'text-green-500';
    if (accuracy >= 70) return 'text-yellow-500';
    if (accuracy >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getAccuracyBadge = (accuracy: number | null) => {
    if (accuracy === null) return null;
    if (accuracy >= 90) return { label: 'Excellent', variant: 'default' as const, className: 'bg-green-500' };
    if (accuracy >= 70) return { label: 'Good', variant: 'default' as const, className: 'bg-yellow-500' };
    if (accuracy >= 50) return { label: 'Fair', variant: 'default' as const, className: 'bg-orange-500' };
    return { label: 'Missed', variant: 'destructive' as const, className: '' };
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
              <p className="text-muted-foreground text-sm">
                Before your next game, predict your stats and earn points based on accuracy!
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Upcoming ({upcomingGames.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  History ({history.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-4">
                {upcomingGames.length === 0 ? (
                  <div className="py-8 space-y-4 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">No Upcoming Games</p>
                      <p className="text-sm text-muted-foreground">
                        Add games to your schedule to start making predictions!
                      </p>
                    </div>
                    <Button variant="outline" onClick={onBack}>
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
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {history.length === 0 ? (
                  <div className="py-8 space-y-4 text-center">
                    <History className="w-16 h-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">No Prediction History</p>
                      <p className="text-sm text-muted-foreground">
                        Your past predictions will appear here after games are played.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Stats Summary */}
                    {history.some(h => h.is_resolved) && (
                      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-primary" />
                              <span className="font-medium">Total Points Earned</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">
                              {history.reduce((sum, h) => sum + h.points_earned, 0)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {history.map((pred) => {
                      const accuracyBadge = getAccuracyBadge(pred.accuracy_score);
                      
                      return (
                        <Card key={pred.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium">vs {pred.opponent}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(pred.date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              {pred.is_resolved ? (
                                accuracyBadge && (
                                  <Badge className={accuracyBadge.className}>
                                    {accuracyBadge.label} • +{pred.points_earned} pts
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Awaiting Stats
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="p-2 rounded bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Points</p>
                                <p className="font-medium">{pred.predicted_points}</p>
                                {pred.is_resolved && pred.actual_points !== null && (
                                  <p className={cn(
                                    'text-xs',
                                    pred.actual_points === pred.predicted_points ? 'text-green-500' : 'text-muted-foreground'
                                  )}>
                                    Actual: {pred.actual_points}
                                  </p>
                                )}
                              </div>
                              <div className="p-2 rounded bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Rebounds</p>
                                <p className="font-medium">{pred.predicted_rebounds}</p>
                                {pred.is_resolved && pred.actual_rebounds !== null && (
                                  <p className={cn(
                                    'text-xs',
                                    pred.actual_rebounds === pred.predicted_rebounds ? 'text-green-500' : 'text-muted-foreground'
                                  )}>
                                    Actual: {pred.actual_rebounds}
                                  </p>
                                )}
                              </div>
                              <div className="p-2 rounded bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Assists</p>
                                <p className="font-medium">{pred.predicted_assists}</p>
                                {pred.is_resolved && pred.actual_assists !== null && (
                                  <p className={cn(
                                    'text-xs',
                                    pred.actual_assists === pred.predicted_assists ? 'text-green-500' : 'text-muted-foreground'
                                  )}>
                                    Actual: {pred.actual_assists}
                                  </p>
                                )}
                              </div>
                            </div>

                            {pred.is_resolved && pred.accuracy_score !== null && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Accuracy</span>
                                  <span className={cn('font-bold', getAccuracyColor(pred.accuracy_score))}>
                                    {pred.accuracy_score.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

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
