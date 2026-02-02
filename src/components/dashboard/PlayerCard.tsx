import { PlayerProfile, GameStats, SeasonStats } from '@/types/basketball';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TierBadges } from '@/components/xp/TierBadges';
import { User, Target, Star, Percent, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierAchievement {
  tier: string;
}

interface PlayerCardProps {
  profile: PlayerProfile;
  teamName?: string;
  tierAchievements?: TierAchievement[];
  seasonRecord?: { wins: number; losses: number };
  games?: GameStats[];
  seasonStats?: SeasonStats;
  xpProgress?: { current_level: number; current_xp: number } | null;
  className?: string;
}

interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}

function QuickStat({ label, value, icon: Icon, accent }: QuickStatProps) {
  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <Icon className={cn("w-3.5 h-3.5 mb-0.5", accent ? "text-primary" : "text-muted-foreground")} />
      <p className={cn("text-sm font-bold tabular-nums", accent && "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

export function PlayerCard({ 
  profile, 
  teamName, 
  tierAchievements = [], 
  seasonRecord, 
  games = [],
  seasonStats,
  xpProgress,
  className 
}: PlayerCardProps) {
  const displayTeam = teamName || profile.team;
  const hasRecord = seasonRecord && (seasonRecord.wins > 0 || seasonRecord.losses > 0);
  
  // Calculate stats
  const lastGame = games[0];
  
  // Calculate current streak
  let streak = 0;
  let streakType: 'W' | 'L' | null = null;
  for (const game of games) {
    if (streakType === null) {
      streakType = game.isWin ? 'W' : 'L';
      streak = 1;
    } else if ((game.isWin && streakType === 'W') || (!game.isWin && streakType === 'L')) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate last 5 games record
  const last5 = games.slice(0, 5);
  const last5Wins = last5.filter(g => g.isWin).length;
  const last5Losses = last5.length - last5Wins;

  const hasStats = seasonStats && games.length > 0;
  
  return (
    <Card className={cn('overflow-hidden border-border/50', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 ring-2 ring-primary/20 flex-shrink-0">
            {profile.avatar ? (
              <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {profile.number || <User className="w-6 h-6" />}
              </AvatarFallback>
            )}
          </Avatar>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground truncate">
                {profile.name}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-semibold">
                #{profile.number}
              </span>
              {hasRecord && (
                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-sm font-medium">
                  {seasonRecord.wins}-{seasonRecord.losses}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
              {profile.position && (
                <span className="font-medium">{profile.position}</span>
              )}
              {profile.position && profile.grade && (
                <span className="text-border">•</span>
              )}
              {profile.grade && (
                <span>{profile.grade}</span>
              )}
              {(profile.position || profile.grade) && displayTeam && (
                <span className="text-border">•</span>
              )}
              <span className="truncate">{displayTeam}</span>
            </div>

            {/* Tier Badges */}
            {tierAchievements.length > 0 && (
              <TierBadges achievedTiers={tierAchievements} size="sm" className="mt-2" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        {hasStats && (
          <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border/50 overflow-x-auto scrollbar-hide">
            {lastGame && (
              <QuickStat
                label="Last Game"
                value={lastGame.points}
                icon={Target}
              />
            )}
            <QuickStat
              label="PPG"
              value={seasonStats.avgPoints.toFixed(1)}
              icon={Star}
            />
            <QuickStat
              label="FG%"
              value={`${seasonStats.fgPercentage.toFixed(0)}%`}
              icon={Percent}
            />
            {streak > 0 && (
              <QuickStat
                label="Streak"
                value={`${streak}${streakType}`}
                icon={Flame}
                accent={streakType === 'W' && streak >= 3}
              />
            )}
            {last5.length > 0 && (
              <QuickStat
                label="Last 5"
                value={`${last5Wins}-${last5Losses}`}
                icon={TrendingUp}
              />
            )}
            {xpProgress && (
              <QuickStat
                label="Level"
                value={xpProgress.current_level}
                icon={Star}
                accent
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
