import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp } from 'lucide-react';
import { usePlan } from '@/hooks/usePlanState';

/**
 * Soft, non-blocking banner shown when a suspected account reset is detected.
 * Encourages progression over reset — never accuses user of abuse.
 */
export function ResetDetectionBanner() {
  const { isSuspectedReset, currentPlan } = usePlan();
  const [dismissed, setDismissed] = useState(false);

  // Only show for free users with suspected reset
  const shouldShow = isSuspectedReset && currentPlan === 'free' && !dismissed;

  // Check if already dismissed this session
  useEffect(() => {
    try {
      const dismissedAt = sessionStorage.getItem('hj_reset_banner_dismissed');
      if (dismissedAt) setDismissed(true);
    } catch { /* ignore */ }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('hj_reset_banner_dismissed', Date.now().toString());
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative mx-4 mt-3 mb-1"
        >
          <div className="bg-secondary/80 border border-border/50 rounded-xl px-4 py-3 flex items-start gap-3 backdrop-blur-sm">
            <div className="flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Your progress is what makes Hoop Journal valuable
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resetting removes your development history. Keep building your game — every stat tells your story.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
