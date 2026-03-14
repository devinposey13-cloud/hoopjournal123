import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, MessageCircle, LayoutDashboard } from 'lucide-react';
import '@lottiefiles/dotlottie-wc';

interface CompletionCardProps {
  playerName: string;
  onStartGame: () => void;
  onPregameTalk?: () => void;
  onExploreDashboard?: () => void;
}

export function CompletionCard({ playerName, onStartGame, onPregameTalk, onExploreDashboard }: CompletionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      {/* Lottie basketball animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4"
      >
        <div
          style={{
            filter: 'drop-shadow(0 0 20px hsl(24 100% 50% / 0.4)) drop-shadow(0 0 40px hsl(24 100% 50% / 0.2))',
          }}
        >
          <dotlottie-wc
            src="https://lottie.host/dc3b3b08-d2bb-46f0-915d-c8d56d0dd2c1/lCHnsbvgB8.lottie"
            style={{ width: '180px', height: '180px' }}
            autoplay
            loop
          />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-3xl md:text-4xl mb-2 text-foreground uppercase tracking-wide"
        style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}
      >
        You're ready to start your Hoop Journal™ season
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-muted-foreground mb-8 text-sm"
      >
        Your Coach is set up and ready, {playerName}.
        <br />
        Let's log your first game or jump into a pregame talk.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={onStartGame}
          className="w-full h-12 text-lg gradient-primary gap-2"
        >
          <Play className="w-5 h-5" />
          Start My First Game
        </Button>

        {onPregameTalk && (
          <Button
            onClick={onPregameTalk}
            variant="outline"
            className="w-full h-11 text-base gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Pregame Talk
          </Button>
        )}

        {onExploreDashboard && (
          <Button
            onClick={onExploreDashboard}
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Explore the Dashboard
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
