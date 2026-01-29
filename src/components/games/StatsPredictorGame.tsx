import { useState } from 'react';
import { ArrowLeft, TrendingUp, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface StatsPredictorGameProps {
  onBack: () => void;
}

export function StatsPredictorGame({ onBack }: StatsPredictorGameProps) {
  const [predictions, setPredictions] = useState({
    points: '',
    rebounds: '',
    assists: '',
  });

  // This is a placeholder - will be integrated with scheduled games later
  const upcomingGames: Array<{
    id: string;
    opponent: string;
    date: string;
    hasPrediction: boolean;
  }> = [];

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
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Predict Your Performance</h3>
              <p className="text-muted-foreground">
                Before your next game, predict how many points, rebounds, and assists you&apos;ll get.
                <br />
                Earn points based on how accurate your predictions are!
              </p>
            </div>

            {upcomingGames.length === 0 ? (
              <div className="py-8 space-y-4">
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
            ) : (
              <div className="space-y-6">
                {/* Upcoming Games List */}
                <div className="space-y-3">
                  {upcomingGames.map((game) => (
                    <Card
                      key={game.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        game.hasPrediction && 'bg-green-500/10 border-green-500/30'
                      )}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">vs {game.opponent}</p>
                          <p className="text-sm text-muted-foreground">{game.date}</p>
                        </div>
                        {game.hasPrediction ? (
                          <span className="text-green-500 text-sm">Predicted ✓</span>
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

                {/* Prediction Form (shown when a game is selected) */}
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
                    <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500">
                      Submit Prediction
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* How it works */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">How Scoring Works</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="font-medium text-green-600">Within 10%</p>
                  <p className="text-muted-foreground">+50 pts</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <p className="font-medium text-yellow-600">Within 20%</p>
                  <p className="text-muted-foreground">+25 pts</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
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
