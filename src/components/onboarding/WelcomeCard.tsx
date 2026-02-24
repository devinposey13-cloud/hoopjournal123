import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface WelcomeCardProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function WelcomeCard({ onNext, onSkip }: WelcomeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <BookOpen className="w-10 h-10 text-primary-foreground" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold mb-3 text-foreground"
      >
        Welcome to Hoop Journal
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground mb-8 text-sm max-w-xs leading-relaxed"
      >
        Track your games. Build your habits.
        <br />
        Watch yourself improve.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={onNext}
          className="w-full h-12 text-lg gradient-primary"
        >
          Continue
        </Button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
