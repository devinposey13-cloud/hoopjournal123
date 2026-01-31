import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import '@lottiefiles/dotlottie-wc';

interface TransitionScreenProps {
  playerName: string;
  onComplete: () => void;
}

export function TransitionScreen({ playerName, onComplete }: TransitionScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress from 0 to 100 over 2.5 seconds
    const duration = 2500;
    const interval = 50;
    const increment = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
    >
      {/* Lottie basketball animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <dotlottie-wc
          src="https://lottie.host/dc3b3b08-d2bb-46f0-915d-c8d56d0dd2c1/lCHnsbvgB8.lottie"
          style={{ width: '200px', height: '200px' }}
          autoplay
          loop
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-2xl md:text-3xl text-center mb-2 text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Profile created, {playerName}.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="text-muted-foreground mb-8"
      >
        Season loading...
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scaleX: 0.8 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full max-w-xs"
      >
        <Progress value={progress} className="h-2" />
      </motion.div>
    </motion.div>
  );
}
