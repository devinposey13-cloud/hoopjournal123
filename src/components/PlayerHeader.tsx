import { useState } from 'react';
import { PlayerProfile, SeasonStats, GameStats } from '@/types/basketball';
import { Trophy, TrendingUp, FileDown, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { exportSeasonStatsPdf } from '@/utils/exportPdf';

interface PlayerHeaderProps {
  profile: PlayerProfile;
  seasonStats: SeasonStats;
  games: GameStats[];
}

export function PlayerHeader({ profile, seasonStats, games }: PlayerHeaderProps) {
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile.name}
            </h1>
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
            <div className="flex items-center justify-center">
              <img 
                src={profile.avatar} 
                alt={profile.name}
                className="w-72 h-72 md:w-80 md:h-80 rounded-2xl object-cover border-4 border-primary/30 shadow-2xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
