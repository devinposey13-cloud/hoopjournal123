import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Mic } from 'lucide-react';

interface CoachPreviewCardProps {
  playerName: string;
  onNext: () => void;
}

export function CoachPreviewCard({ playerName, onNext }: CoachPreviewCardProps) {
  const displayName = playerName || 'Player';

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <h2 className="text-2xl md:text-3xl mb-2 text-foreground font-semibold">
        Meet your Coach AI
      </h2>

      <p className="text-muted-foreground mb-6 text-sm max-w-xs">
        Your personal basketball coach that learns how you play.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-5">
        <Card className="p-3 border-border bg-card">
          <MessageCircle className="w-5 h-5 text-primary mb-2" />
          <div className="text-xs font-semibold text-foreground">Pregame Talk</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Get mentally ready</div>
        </Card>
        <Card className="p-3 border-border bg-card">
          <Mic className="w-5 h-5 text-primary mb-2" />
          <div className="text-xs font-semibold text-foreground">Postgame Recap</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">AI-powered insights</div>
        </Card>
      </div>

      {/* Example message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm mb-5"
      >
        <Card className="p-4 border-primary/30 bg-primary/5 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-sm">🏀</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Coach</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "Nice game, {displayName}! You shot 60% from the field and had 4 assists. 
                Your ball movement was solid — let's work on free throws next practice."
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <p className="text-xs text-muted-foreground mb-5 opacity-75">
        Free includes 2 AI recaps per month.
      </p>

      <Button
        onClick={onNext}
        className="w-full max-w-sm h-12 text-lg gradient-primary"
      >
        Next
      </Button>
    </motion.div>
  );
}
