import { PlayerProfile } from '@/types/basketball';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TierBadges } from '@/components/xp/TierBadges';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierAchievement {
  tier: string;
}

interface PlayerCardProps {
  profile: PlayerProfile;
  teamName?: string;
  tierAchievements?: TierAchievement[];
  className?: string;
}

export function PlayerCard({ profile, teamName, tierAchievements = [], className }: PlayerCardProps) {
  // Get the highest tier for display priority
  const displayTeam = teamName || profile.team;
  
  return (
    <Card className={cn('overflow-hidden border-border/50', className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
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
      </CardContent>
    </Card>
  );
}
