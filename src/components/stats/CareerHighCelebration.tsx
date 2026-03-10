import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CareerHigh } from '@/utils/statsCalculations';

interface CareerHighCelebrationProps {
  newHighs: CareerHigh[];
  onDismiss: () => void;
}

export function CareerHighCelebration({ newHighs, onDismiss }: CareerHighCelebrationProps) {
  if (newHighs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-5 mb-4 overflow-hidden"
      >
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-lg">
              New Career High{newHighs.length > 1 ? 's' : ''}!
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {newHighs.map((high, i) => (
              <motion.div
                key={high.stat}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
              >
                <span className="text-lg">{high.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">{high.stat}</p>
                  <p className="text-sm font-black text-foreground">{high.displayValue}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {newHighs.length === 1 && (
            <p className="text-sm text-muted-foreground mt-3">
              Your best {newHighs[0].stat.toLowerCase()} game yet! 🔥
            </p>
          )}
          {newHighs.length > 1 && (
            <p className="text-sm text-muted-foreground mt-3">
              What a performance — {newHighs.length} personal bests in one game! 🏆
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
