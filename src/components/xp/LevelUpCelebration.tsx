import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { LevelBadge } from './LevelBadge';
import { getLevelTier, getLevelTierGradient } from '@/utils/xpCalculations';
import { Trophy, Star, Sparkles } from 'lucide-react';
import type { LevelReward } from '@/types/xp';

interface LevelUpCelebrationProps {
  previousLevel: number;
  newLevel: number;
  newRewards: LevelReward[];
  onComplete: () => void;
}

export function LevelUpCelebration({ 
  previousLevel, 
  newLevel, 
  newRewards,
  onComplete 
}: LevelUpCelebrationProps) {
  const [stage, setStage] = useState<'counting' | 'reveal' | 'rewards'>('counting');
  const [displayLevel, setDisplayLevel] = useState(previousLevel);
  const gradient = getLevelTierGradient(newLevel);
  const tier = getLevelTier(newLevel);

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  // Level counting animation
  useEffect(() => {
    if (stage !== 'counting') return;

    const totalLevels = newLevel - previousLevel;
    const delayPerLevel = Math.min(200, 1000 / totalLevels);

    let current = previousLevel;
    const interval = setInterval(() => {
      current++;
      setDisplayLevel(current);
      
      if (current >= newLevel) {
        clearInterval(interval);
        setTimeout(() => {
          setStage('reveal');
          if (newRewards.length > 0) {
            setTimeout(() => setStage('rewards'), 2000);
          } else {
            setTimeout(onComplete, 3000);
          }
        }, 500);
      }
    }, delayPerLevel);

    return () => clearInterval(interval);
  }, [stage, previousLevel, newLevel, newRewards.length, onComplete]);

  // Auto-close after rewards
  useEffect(() => {
    if (stage === 'rewards') {
      const timer = setTimeout(onComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [stage, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <AnimatePresence mode="wait">
        {stage === 'counting' && (
          <motion.div
            key="counting"
            className="text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
          >
            <motion.div
              className="text-6xl font-black mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
            >
              <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', gradient)}>
                Level {displayLevel}
              </span>
            </motion.div>
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div
            key="reveal"
            className="text-center space-y-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <motion.div
              className="flex justify-center"
              animate={{ 
                filter: ['drop-shadow(0 0 20px gold)', 'drop-shadow(0 0 40px gold)', 'drop-shadow(0 0 20px gold)']
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <LevelBadge level={newLevel} size="lg" />
            </motion.div>
            
            <div className="space-y-2">
              <motion.h2
                className="text-4xl font-black text-white flex items-center justify-center gap-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Star className="w-8 h-8 text-yellow-400" />
                LEVEL UP!
                <Star className="w-8 h-8 text-yellow-400" />
              </motion.h2>
              
              <motion.p
                className={cn('text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent', gradient)}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {tier} Tier
              </motion.p>
            </div>
          </motion.div>
        )}

        {stage === 'rewards' && newRewards.length > 0 && (
          <motion.div
            key="rewards"
            className="text-center space-y-6"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
          >
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Sparkles className="w-6 h-6" />
              <Trophy className="w-8 h-8" />
              <Sparkles className="w-6 h-6" />
            </div>
            
            <h3 className="text-2xl font-bold text-white">Rewards Unlocked!</h3>
            
            <div className="space-y-3">
              {newRewards.map((reward, i) => (
                <motion.div
                  key={reward.id}
                  className="flex items-center justify-center gap-3 text-white bg-white/10 rounded-xl px-6 py-3"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                >
                  <span className="text-3xl">{reward.reward_icon}</span>
                  <div className="text-left">
                    <p className="font-bold">{reward.reward_name}</p>
                    <p className="text-sm text-white/70">{reward.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        className="absolute bottom-10 text-white/50 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Tap anywhere to continue
      </motion.p>
    </motion.div>
  );
}
