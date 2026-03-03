import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayerProfile, SeasonStats, GameStats } from '@/types/basketball';
import { Trophy, TrendingUp, FileDown, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { exportSeasonStatsPdf } from '@/utils/exportPdf';
import { LevelBadge } from '@/components/xp/LevelBadge';
import { TierBadges } from '@/components/xp/TierBadges';
import type { XpProgress } from '@/types/xp';

interface TierAchievement {
  tier: string;
}

interface PlayerHeaderProps {
  profile: PlayerProfile;
  seasonStats: SeasonStats;
  games: GameStats[];
  xpProgress?: XpProgress | null;
  tierAchievements?: TierAchievement[];
}

export function PlayerHeader({ profile, seasonStats, games, xpProgress, tierAchievements = [] }: PlayerHeaderProps) {
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);

  const handleExport = () => {
    exportSeasonStatsPdf(profile, seasonStats, games);
  };

  return (
    <>
      <div className="gradient-card rounded-2xl p-6 shadow-card border border-border/50">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div 
              className={`w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow overflow-hidden ${profile.avatar ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
              onClick={() => profile.avatar && setShowAvatarPreview(true)}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-primary-foreground">
                  {profile.number}
                </span>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {profile.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-medium">
                #{profile.number}
              </span>
              <span>{profile.position}</span>
              <span>•</span>
              <span>{profile.team}</span>
              <span>•</span>
              <span>{profile.grade}</span>
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary hover:text-primary/80 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
            {/* Tier Achievement Badges */}
            {tierAchievements.length > 0 && (
              <TierBadges achievedTiers={tierAchievements} size="sm" className="mt-3" />
            )}
          </div>

          {/* Season Record & Export */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-primary">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm font-medium">Record</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {seasonStats.wins}-{seasonStats.losses}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">PPG</span>
                </div>
                <p className="text-2xl font-bold mt-1">{seasonStats.avgPoints}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="hidden md:flex"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Avatar Enlargement Dialog */}
      {profile.avatar && (
        <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <img 
                  src={profile.avatar} 
                  alt={profile.name}
                  className="w-72 h-72 md:w-80 md:h-80 rounded-2xl object-cover border-4 border-primary/30 shadow-2xl"
                />
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 text-foreground text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg backdrop-blur-sm border border-border"
                >
                  {profile.name}
                </motion.div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
