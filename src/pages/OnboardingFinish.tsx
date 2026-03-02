import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, LayoutDashboard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import canvasConfetti from 'canvas-confetti';
import { track } from '@/lib/plans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function OnboardingFinish() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confettiFired = useRef(false);
  const onboardingCompleted = useRef(false);

  // Auto-complete onboarding when returning from Stripe checkout
  useEffect(() => {
    if (onboardingCompleted.current) return;
    onboardingCompleted.current = true;

    const completeOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Mark onboarding as complete in the database
        const { error } = await supabase
          .from('player_settings')
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_active_profile', true);

        if (error) {
          console.error('[OnboardingFinish] Failed to mark onboarding complete:', error);
        } else {
          console.log('[OnboardingFinish] Onboarding marked complete');
        }

        if (searchParams.get('success') === 'true') {
          toast.success('Subscription activated! 🎉');
          track('onboarding_checkout_success', {});
        }
      } catch (err) {
        console.error('[OnboardingFinish] Error completing onboarding:', err);
      }
    };

    completeOnboarding();
  }, [searchParams]);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Fire confetti
    const fire = (opts: canvasConfetti.Options) => {
      canvasConfetti({
        ...opts,
        disableForReducedMotion: true,
      });
    };

    setTimeout(() => {
      fire({ particleCount: 60, spread: 55, origin: { x: 0.3, y: 0.6 } });
      fire({ particleCount: 60, spread: 55, origin: { x: 0.7, y: 0.6 } });
    }, 300);

    setTimeout(() => {
      fire({ particleCount: 40, spread: 80, origin: { x: 0.5, y: 0.5 } });
    }, 600);
  }, []);

  const handleLogGame = () => {
    track('onboarding_finished', { action: 'log_game' });
    navigate('/', { state: { openGameDialog: true } });
  };

  const handleExplore = () => {
    track('onboarding_finished', { action: 'explore' });
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Animated check / icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center shadow-glow mb-8"
      >
        <span className="text-4xl">🏀</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-3 text-center"
      >
        You're in.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="text-muted-foreground text-base mb-10 text-center max-w-xs"
      >
        Log your first game and earn XP.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={handleLogGame}
          className="w-full h-13 text-lg gradient-primary gap-2"
        >
          <Play className="w-5 h-5" />
          Log First Game
        </Button>

        <Button
          variant="outline"
          onClick={handleExplore}
          className="w-full h-11 text-base gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Explore Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
