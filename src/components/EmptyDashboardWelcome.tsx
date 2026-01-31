import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mic } from 'lucide-react';

interface EmptyDashboardWelcomeProps {
  playerName: string;
  onLogFirstGame: () => void;
  onPregameTalk: () => void;
}

export function EmptyDashboardWelcome({ 
  playerName, 
  onLogFirstGame, 
  onPregameTalk 
}: EmptyDashboardWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* Coach AI Card */}
      <Card className="w-full max-w-md bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-lg">
        <CardContent className="pt-8 pb-6 px-6 text-center">
          {/* Coach AI Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-4xl">🏀</span>
          </motion.div>

          {/* Coach AI Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
              Coach AI
            </div>
            <h3 
              className="text-2xl text-foreground"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              Hey {playerName}!
            </h3>
          </motion.div>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-8 leading-relaxed"
          >
            First game hasn't been logged yet — but every season starts somewhere.
            Let me know when you're ready.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button
              onClick={onLogFirstGame}
              className="flex-1 h-12 gradient-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log First Game
            </Button>
            <Button
              onClick={onPregameTalk}
              variant="outline"
              className="flex-1 h-12"
            >
              <Mic className="w-4 h-4 mr-2" />
              Pregame Talk
            </Button>
          </motion.div>
        </CardContent>
      </Card>

      {/* Motivational subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.7 }}
        className="text-sm text-muted-foreground mt-6 text-center"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        "Every expert was once a beginner."
      </motion.p>
    </motion.div>
  );
}
