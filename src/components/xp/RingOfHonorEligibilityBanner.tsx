import { motion } from 'framer-motion';
import { Crown, ArrowRight, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface RingOfHonorEligibilityBannerProps {
  isEligible: boolean;
  isAlreadyMember: boolean;
  hasOptedIn: boolean;
  onJoinClick: () => void;
}

export function RingOfHonorEligibilityBanner({
  isEligible,
  isAlreadyMember,
  hasOptedIn,
  onJoinClick,
}: RingOfHonorEligibilityBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not eligible, already a member, or dismissed
  if (!isEligible || isAlreadyMember || isDismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10"
    >
      {/* Floating stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/40 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative p-4">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-6 h-6 text-white" />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 bg-clip-text text-transparent">
              🎉 You've Reached Level 50!
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasOptedIn 
                ? "You're eligible to join the Ring of Honor and be immortalized among the legends!"
                : "Enable Ring of Honor opt-in in Settings to join the legends!"
              }
            </p>
          </div>

          <div className="flex-shrink-0">
            {hasOptedIn ? (
              <Button
                onClick={onJoinClick}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
              >
                <Star className="w-4 h-4 mr-2 fill-current" />
                Join Now
              </Button>
            ) : (
              <Link to="/?tab=settings">
                <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10">
                  Go to Settings
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
