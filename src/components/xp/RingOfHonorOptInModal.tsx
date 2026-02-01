import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Crown, Sparkles } from 'lucide-react';
import { useConfetti } from '@/hooks/useConfetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getQuarterString } from '@/utils/quarterUtils';

interface RingOfHonorOptInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: {
    displayName: string;
    avatarUrl?: string;
  };
  onSuccess?: () => void;
}

export function RingOfHonorOptInModal({
  open,
  onOpenChange,
  playerData,
  onSuccess,
}: RingOfHonorOptInModalProps) {
  const { user } = useAuth();
  const { fireAchievementConfetti } = useConfetti();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleJoinRingOfHonor = async () => {
    if (!user || !acceptTerms) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('ring_of_honor').insert({
        user_id: user.id,
        display_name: playerData.displayName,
        avatar_url: playerData.avatarUrl || null,
        quarter: getQuarterString(),
        achieved_at: new Date().toISOString(),
        inducted_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Fire celebratory confetti
      fireAchievementConfetti();

      toast.success('Welcome to the Ring of Honor! 🏆', {
        description: 'Your legendary achievement has been immortalized.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error joining Ring of Honor:', error);
      toast.error('Failed to join Ring of Honor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    toast.info('No worries! You can join later from your profile settings.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden border-2 border-amber-500/30 bg-gradient-to-b from-background to-amber-950/10">
        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <AnimatePresence>
            {open && [...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 100, x: Math.random() * 100 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: -100,
                  x: Math.random() * 400,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                }}
                className="absolute bottom-0 left-0"
              >
                <Sparkles className="w-3 h-3 text-amber-400/40" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <DialogHeader className="relative z-10">
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-4 rounded-full shadow-2xl">
                <Crown className="w-12 h-12 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-2"
              >
                {[...Array(6)].map((_, i) => (
                  <Star
                    key={i}
                    className="absolute w-4 h-4 text-amber-400 fill-amber-400"
                    style={{
                      top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 6)}%`,
                      left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 6)}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DialogTitle className="text-2xl text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 bg-clip-text text-transparent font-bold">
              LEGENDARY STATUS ACHIEVED!
            </DialogTitle>
            <DialogDescription className="text-center mt-2 text-muted-foreground">
              You've reached <span className="text-amber-400 font-bold">Level 50</span> — the pinnacle of greatness!
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 space-y-4 mt-4"
        >
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h4 className="font-semibold text-foreground">Join the Ring of Honor</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Immortalize your achievement by joining the Ring of Honor. Your name and avatar 
              will be displayed on the public leaderboard for all to see.
            </p>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="accept-terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
              />
              <Label
                htmlFor="accept-terms"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                I agree to display my name and avatar publicly on the Ring of Honor
              </Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={isSubmitting}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
              onClick={handleJoinRingOfHonor}
              disabled={!acceptTerms || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Star className="w-4 h-4" />
                  </motion.div>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Join the Legends
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
