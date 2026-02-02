import { useState } from 'react';
import { PlayerProfile, GameStats, SeasonStats } from '@/types/basketball';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TierBadges } from '@/components/xp/TierBadges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Target, Star, Percent, Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  tooltip?: string;
}

function QuickStat({ label, value, icon: Icon, accent, tooltip }: QuickStatProps) {
  const content = (
    <div className="flex flex-col items-center min-w-[48px] cursor-default">
      <Icon className={cn("w-3.5 h-3.5 mb-0.5", accent ? "text-primary" : "text-muted-foreground")} />
      <p className={cn("text-sm font-bold tabular-nums", accent && "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// Tier colors mapping
const TIER_COLORS: Record<string, { ring: string; glow: string }> = {
  'Legendary': { ring: 'ring-amber-400', glow: 'shadow-[0_0_20px_-3px_rgba(251,191,36,0.5)]' },
  'Elite': { ring: 'ring-purple-500', glow: 'shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]' },
  'Great': { ring: 'ring-blue-500', glow: 'shadow-[0_0_12px_-3px_rgba(59,130,246,0.4)]' },
  'Solid': { ring: 'ring-emerald-500', glow: 'shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)]' },
  'Rising': { ring: 'ring-sky-400', glow: '' },
  'Starter': { ring: 'ring-slate-400', glow: '' },
};

const TIER_ORDER = ['Legendary', 'Elite', 'Great', 'Solid', 'Rising', 'Starter'];

function getHighestTier(achievements: TierAchievement[]): string | null {
  if (achievements.length === 0) return null;
  const tiers = achievements.map(a => a.tier);
  for (const tier of TIER_ORDER) {
    if (tiers.includes(tier)) return tier;
  }
  return null;
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
  const [avatarOpen, setAvatarOpen] = useState(false);
  const displayTeam = teamName || profile.team;
  const hasRecord = seasonRecord && (seasonRecord.wins > 0 || seasonRecord.losses > 0);
  const highestTier = getHighestTier(tierAchievements);
  const tierStyle = highestTier ? TIER_COLORS[highestTier] : null;
  
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
  const isOnWinStreak = streakType === 'W' && streak >= 2;
  const isHotStreak = streakType === 'W' && streak >= 3;
  
  return (
    <>
      <Card className={cn(
        'overflow-hidden border-border/50 transition-all duration-300',
        isOnWinStreak && 'border-green-500/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]',
        isHotStreak && 'border-green-500/50 shadow-[0_0_25px_-3px_rgba(34,197,94,0.3)] ring-1 ring-green-500/20',
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-5">
            {/* Avatar - Large focal point, clickable with tier-colored ring */}
            <button
              onClick={() => setAvatarOpen(true)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
              aria-label="View full profile photo"
            >
              <Avatar className={cn(
                "h-24 w-24 md:h-28 md:w-28 ring-4 flex-shrink-0 cursor-pointer transition-shadow duration-300",
                tierStyle ? `${tierStyle.ring} ${tierStyle.glow}` : 'ring-primary/20 shadow-lg'
              )}>
                {profile.avatar ? (
                  <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl md:text-4xl font-bold">
                    {profile.number || <User className="w-10 h-10" />}
                  </AvatarFallback>
                )}
              </Avatar>
            </button>

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
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border/50 overflow-x-auto scrollbar-hide">
                {lastGame && (
                  <QuickStat
                    label="Last Game"
                    value={lastGame.points}
                    icon={Target}
                    tooltip={`Points scored in your most recent game vs ${lastGame.opponent}`}
                  />
                )}
                <QuickStat
                  label="PPG"
                  value={seasonStats.avgPoints.toFixed(1)}
                  icon={Star}
                  tooltip="Points per game average this season"
                />
                <QuickStat
                  label="FG%"
                  value={`${seasonStats.fgPercentage.toFixed(0)}%`}
                  icon={Percent}
                  tooltip="Field goal percentage this season"
                />
                {streak > 0 && (
                  <QuickStat
                    label="Streak"
                    value={`${streak}${streakType}`}
                    icon={Flame}
                    accent={streakType === 'W' && streak >= 3}
                    tooltip={streakType === 'W' ? `${streak} game winning streak` : `${streak} game losing streak`}
                  />
                )}
                {last5.length > 0 && (
                  <QuickStat
                    label="Last 5"
                    value={`${last5Wins}-${last5Losses}`}
                    icon={TrendingUp}
                    tooltip={`Record in last 5 games: ${last5Wins} wins, ${last5Losses} losses`}
                  />
                )}
                {xpProgress && (
                  <QuickStat
                    label="Level"
                    value={xpProgress.current_level}
                    icon={Star}
                    accent
                    tooltip={`Current XP level (${xpProgress.current_xp.toLocaleString()} XP)`}
                  />
                )}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Avatar Fullscreen Modal */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none overflow-hidden">
          <DialogTitle className="sr-only">{profile.name}'s Profile Photo</DialogTitle>
          <AnimatePresence mode="wait">
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    mass: 0.8
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.9, 
                  y: -10,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="relative">
                    {/* Glow effect behind avatar - tier colored */}
                    <motion.div 
                      className={cn(
                        "absolute inset-0 rounded-full blur-2xl scale-110",
                        tierStyle ? tierStyle.ring.replace('ring-', 'bg-').replace('-500', '-500/30').replace('-400', '-400/30') : 'bg-primary/20'
                      )}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1.1,
                        transition: { delay: 0.1, duration: 0.4 }
                      }}
                    />
                    <Avatar className={cn(
                      "h-72 w-72 md:h-80 md:w-80 ring-4 shadow-2xl relative z-10",
                      tierStyle ? tierStyle.ring : 'ring-primary/30'
                    )}>
                      {profile.avatar ? (
                        <AvatarImage src={profile.avatar} alt={profile.name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary text-7xl font-bold">
                          {profile.number || <User className="w-20 h-20" />}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                </div>
                <motion.div 
                  className="text-center mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: 0.15, duration: 0.3 }
                  }}
                >
                  <p className="text-xl font-bold text-white drop-shadow-lg">{profile.name}</p>
                  <p className="text-sm text-white/80 drop-shadow">#{profile.number} • {displayTeam}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
