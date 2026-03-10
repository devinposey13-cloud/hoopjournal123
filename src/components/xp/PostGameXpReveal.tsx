import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getTierDisplayName, getTierGradient, getTierColorClass } from '@/utils/performanceScoring';
import { formatXp, getLevelTierGradient } from '@/utils/xpCalculations';
import { LevelBadge } from './LevelBadge';
import { XpProgressBar } from './XpProgressBar';
import { InsightCard } from '@/components/insights/InsightCard';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, Zap, Star, Trophy, Flame } from 'lucide-react';
import type { PerformanceResult, XpGainResult, LevelReward } from '@/types/xp';
import type { PostGameInsight } from '@/utils/postGameInsights';

interface PostGameXpRevealProps {
  performance: PerformanceResult;
  xpResult: XpGainResult;
  onClose: () => void;
  onContinue?: () => void;
  insight?: PostGameInsight | null;
}

export function PostGameXpReveal({ 
  performance, 
  xpResult, 
  onClose,
  onContinue 
}: PostGameXpRevealProps) {
  const tierGradient = getTierGradient(performance.tier);
  const tierColor = getTierColorClass(performance.tier);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {/* Header gradient */}
        <div className={cn('h-24 bg-gradient-to-r relative', tierGradient)}>
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-6 pb-6 -mt-12">
          {/* Performance Tier */}
          <motion.div
            className="text-center mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border shadow-lg',
              tierColor
            )}>
              <Star className="w-5 h-5" />
              <span className="font-bold text-lg">{getTierDisplayName(performance.tier)} Game</span>
            </div>
            <p className="text-muted-foreground mt-2">
              Performance Score: {Math.round(performance.finalScore)}
            </p>
          </motion.div>

          {/* XP Earned */}
          <motion.div
            className="bg-muted/50 rounded-xl p-4 mb-4"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">XP Earned</span>
              </div>
              <motion.span
                className="text-2xl font-bold text-yellow-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                +{formatXp(xpResult.xpGained)}
              </motion.span>
            </div>

            {/* Recovery Bonus */}
            {xpResult.recoveryBonus > 0 && (
              <motion.div
                className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.65 }}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Recovery Bonus</span>
                </div>
                <span className="text-sm font-bold text-primary">+{xpResult.recoveryBonus} XP</span>
              </motion.div>
            )}

            {/* Recovery message */}
            {xpResult.recoveryBonus > 0 && (
              <motion.p
                className="text-xs text-muted-foreground mb-2 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
              >
                Nice recovery. Your season record stays complete.
              </motion.p>
            )}

            {/* Streak Bonus */}
            {xpResult.streakBonus > 0 && (
              <motion.div
                className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.68 }}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-500">
                    {xpResult.streakCount} Game Streak
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-500">+{xpResult.streakBonus} XP</span>
              </motion.div>
            )}

            {/* Bonuses */}
            {performance.bonuses.length > 0 && (
              <div className="space-y-1">
                {performance.bonuses.map((bonus, i) => (
                  <motion.div
                    key={bonus}
                    className="text-sm text-green-500 flex items-center gap-1"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {bonus}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Level Progress */}
          <motion.div
            className="space-y-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-between">
              <LevelBadge level={xpResult.newLevel} size="md" showTier />
              {xpResult.didLevelUp && (
                <motion.div
                  className="flex items-center gap-1 text-green-500 font-semibold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                >
                  <Trophy className="w-4 h-4" />
                  Level Up!
                </motion.div>
              )}
            </div>
            
            <XpProgressBar 
              currentXp={xpResult.newXp} 
              level={xpResult.newLevel} 
              animate 
            />
          </motion.div>

          {/* New Rewards */}
          <AnimatePresence>
            {xpResult.newRewards.length > 0 && (
              <motion.div
                className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">New Rewards Unlocked!</span>
                </div>
                <div className="space-y-2">
                  {xpResult.newRewards.map((reward, i) => (
                    <motion.div
                      key={reward.id}
                      className="flex items-center gap-2 text-sm"
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.4 + i * 0.1 }}
                    >
                      <span className="text-lg">{reward.reward_icon}</span>
                      <span>{reward.reward_name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue Button */}
          <motion.div
            className="mt-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button 
              className="w-full" 
              size="lg"
              onClick={onContinue || onClose}
            >
              Continue
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
