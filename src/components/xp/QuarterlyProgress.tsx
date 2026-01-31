import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarDays, TrendingUp, Trophy, Target, Gift, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LevelBadge } from './LevelBadge';
import { XpProgressBar } from './XpProgressBar';
import { getQuarterDisplayName, getQuarterSeasonName } from '@/utils/quarterUtils';
import { formatXp, getGamesToMaxLevel, XP_CONFIG } from '@/utils/xpCalculations';
import type { XpProgress, QuarterInfo } from '@/types/xp';

interface QuarterlyProgressProps {
  progress: XpProgress | null;
  quarterInfo: QuarterInfo;
  className?: string;
}

export function QuarterlyProgress({ progress, quarterInfo, className }: QuarterlyProgressProps) {
  const currentLevel = progress?.current_level ?? 1;
  const currentXp = progress?.current_xp ?? 0;
  const gamesLogged = progress?.games_logged ?? 0;
  const peakLevel = progress?.peak_level ?? 1;
  
  const avgXpPerGame = gamesLogged > 0 ? currentXp / gamesLogged : 300; // Default estimate
  const gamesToMax = getGamesToMaxLevel(avgXpPerGame, currentXp);
  const seasonName = getQuarterSeasonName(quarterInfo.quarterNum);

  return (
    <motion.div
      className={cn('bg-card rounded-xl border border-border p-4 space-y-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LevelBadge level={currentLevel} size="lg" />
          <div>
            <h3 className="font-bold text-lg">{seasonName} Season</h3>
            <p className="text-sm text-muted-foreground">
              {getQuarterDisplayName(quarterInfo.quarter)}
            </p>
          </div>
        </div>
        
        {currentLevel >= XP_CONFIG.MAX_LEVEL && (
          <div className="flex items-center gap-1 text-yellow-500 font-semibold">
            <Trophy className="w-5 h-5" />
            <span>MAX</span>
          </div>
        )}
      </div>

      {/* XP Progress */}
      <XpProgressBar currentXp={currentXp} level={currentLevel} animate={false} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>Total XP</span>
          </div>
          <p className="font-bold text-lg">{formatXp(currentXp)}</p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Trophy className="w-3 h-3" />
            <span>Peak Level</span>
          </div>
          <p className="font-bold text-lg">{peakLevel}</p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Target className="w-3 h-3" />
            <span>Games Logged</span>
          </div>
          <p className="font-bold text-lg">{gamesLogged}</p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CalendarDays className="w-3 h-3" />
            <span>Days Left</span>
          </div>
          <p className="font-bold text-lg">{quarterInfo.daysRemaining}</p>
        </div>
      </div>

      {/* Projection */}
      {currentLevel < XP_CONFIG.MAX_LEVEL && gamesToMax < Infinity && (
        <div className="text-xs text-center text-muted-foreground">
          ~{gamesToMax} games to Level 50 at current pace
        </div>
      )}

      {/* View Rewards Link */}
      <Link 
        to="/rewards" 
        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-medium group"
      >
        <Gift className="w-4 h-4" />
        <span>View All Rewards</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  );
}
