import { useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderboard, LeaderboardType } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

const LEADERBOARD_OPTIONS: { value: LeaderboardType; label: string }[] = [
  { value: 'all_time', label: 'All-Time Points' },
  { value: 'free_throw', label: 'Free Throw High Score' },
  { value: 'memory_match', label: 'Memory Match (Fastest)' },
  { value: 'reaction_drill', label: 'Reaction Drill (Fastest)' },
  { value: 'trivia', label: 'Trivia Accuracy' },
];

export function Leaderboard() {
  const [type, setType] = useState<LeaderboardType>('all_time');
  const { entries, loading } = useLeaderboard(type);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Leaderboard
          </CardTitle>
          <Select value={type} onValueChange={(v) => setType(v as LeaderboardType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEADERBOARD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No scores yet!</p>
            <p className="text-sm text-muted-foreground">
              Be the first to play and claim the top spot.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.user_id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg transition-colors',
                  index < 3 && 'bg-secondary/50',
                  index === 0 && 'bg-yellow-500/10 border border-yellow-500/30'
                )}
              >
                <div className="w-6 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                
                <Avatar className="w-10 h-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>
                    {(entry.display_name || 'A').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {entry.display_name || 'Anonymous Player'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.games_played} games played
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-lg">{entry.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
