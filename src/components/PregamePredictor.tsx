import { useState, useEffect } from 'react';
import { TrendingUp, Target, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PregamePredictorProps {
  scheduledGameId: string;
  opponent: string;
  compact?: boolean;
}

interface Prediction {
  id: string;
  predicted_points: number;
  predicted_rebounds: number;
  predicted_assists: number;
}

export function PregamePredictor({ scheduledGameId, opponent, compact = false }: PregamePredictorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null);
  const [predictions, setPredictions] = useState({
    points: '',
    rebounds: '',
    assists: '',
  });

  useEffect(() => {
    if (user && scheduledGameId) {
      fetchPrediction();
    }
  }, [user, scheduledGameId]);

  const fetchPrediction = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stats_predictions')
        .select('id, predicted_points, predicted_rebounds, predicted_assists')
        .eq('user_id', user.id)
        .eq('scheduled_game_id', scheduledGameId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingPrediction(data);
        setPredictions({
          points: data.predicted_points.toString(),
          rebounds: data.predicted_rebounds.toString(),
          assists: data.predicted_assists.toString(),
        });
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const points = parseInt(predictions.points) || 0;
    const rebounds = parseInt(predictions.rebounds) || 0;
    const assists = parseInt(predictions.assists) || 0;

    if (points === 0 && rebounds === 0 && assists === 0) {
      toast.error('Please enter at least one prediction');
      return;
    }

    setSaving(true);
    try {
      if (existingPrediction) {
        const { error } = await supabase
          .from('stats_predictions')
          .update({
            predicted_points: points,
            predicted_rebounds: rebounds,
            predicted_assists: assists,
          })
          .eq('id', existingPrediction.id);

        if (error) throw error;
        toast.success('Prediction updated!');
      } else {
        const { data, error } = await supabase
          .from('stats_predictions')
          .insert({
            user_id: user.id,
            scheduled_game_id: scheduledGameId,
            predicted_points: points,
            predicted_rebounds: rebounds,
            predicted_assists: assists,
          })
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setExistingPrediction({
            id: data.id,
            predicted_points: data.predicted_points,
            predicted_rebounds: data.predicted_rebounds,
            predicted_assists: data.predicted_assists,
          });
        }
        toast.success('Prediction saved! Good luck!');
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
      toast.error('Failed to save prediction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={compact ? "bg-muted/30 rounded-lg p-3" : "stat-card"}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Compact mode - inline horizontal layout
  if (compact) {
    return (
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Label */}
          <div className="flex items-center gap-2 sm:min-w-[140px]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Stats Predictor</p>
              {existingPrediction && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </p>
              )}
            </div>
          </div>
          
          {/* Inputs */}
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 max-w-[80px]">
              <Input
                type="number"
                min="0"
                placeholder="PTS"
                value={predictions.points}
                onChange={(e) => setPredictions({ ...predictions, points: e.target.value })}
                className="h-9 text-center text-sm font-medium"
              />
            </div>
            <div className="flex-1 max-w-[80px]">
              <Input
                type="number"
                min="0"
                placeholder="REB"
                value={predictions.rebounds}
                onChange={(e) => setPredictions({ ...predictions, rebounds: e.target.value })}
                className="h-9 text-center text-sm font-medium"
              />
            </div>
            <div className="flex-1 max-w-[80px]">
              <Input
                type="number"
                min="0"
                placeholder="AST"
                value={predictions.assists}
                onChange={(e) => setPredictions({ ...predictions, assists: e.target.value })}
                className="h-9 text-center text-sm font-medium"
              />
            </div>
            <Button 
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600 text-white h-9 px-3"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full mode - original layout
  return (
    <div className="stat-card">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Stats Predictor</h3>
          <p className="text-xs text-muted-foreground">
            Predict your performance vs {opponent}
          </p>
        </div>
        {existingPrediction && (
          <div className="flex items-center gap-1 text-green-500 text-xs font-medium">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      {/* Prediction Form */}
      <div className="pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pred-points" className="text-xs">Points</Label>
            <Input
              id="pred-points"
              type="number"
              min="0"
              placeholder="0"
              value={predictions.points}
              onChange={(e) => setPredictions({ ...predictions, points: e.target.value })}
              className="h-10 text-center text-lg font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pred-rebounds" className="text-xs">Rebounds</Label>
            <Input
              id="pred-rebounds"
              type="number"
              min="0"
              placeholder="0"
              value={predictions.rebounds}
              onChange={(e) => setPredictions({ ...predictions, rebounds: e.target.value })}
              className="h-10 text-center text-lg font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pred-assists" className="text-xs">Assists</Label>
            <Input
              id="pred-assists"
              type="number"
              min="0"
              placeholder="0"
              value={predictions.assists}
              onChange={(e) => setPredictions({ ...predictions, assists: e.target.value })}
              className="h-10 text-center text-lg font-semibold"
            />
          </div>
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : existingPrediction ? (
            <>
              <Target className="w-4 h-4 mr-2" />
              Update Prediction
            </>
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Lock In Prediction
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Earn points based on how close your predictions are to your actual stats!
        </p>
      </div>
    </div>
  );
}
