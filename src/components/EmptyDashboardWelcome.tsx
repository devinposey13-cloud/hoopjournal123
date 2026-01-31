import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Mic, Camera, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface EmptyDashboardWelcomeProps {
  playerName: string;
  avatarUrl?: string;
  onLogFirstGame: () => void;
  onPregameTalk: () => void;
  onUploadPhoto: () => void;
  onSkipPhoto: () => void;
}

export function EmptyDashboardWelcome({ 
  playerName, 
  avatarUrl,
  onLogFirstGame, 
  onPregameTalk,
  onUploadPhoto,
  onSkipPhoto
}: EmptyDashboardWelcomeProps) {
  const hasAvatar = Boolean(avatarUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Coach AI Card */}
        <Card className="bg-gradient-to-br from-card to-card/80 border-2 border-primary/20 shadow-lg">
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
              className="text-muted-foreground mb-8 leading-relaxed text-sm"
            >
              First game hasn't been logged yet — but every season starts somewhere.
              Let me know when you're ready.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={onLogFirstGame}
                className="w-full h-12 gradient-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log First Game
              </Button>
              <Button
                onClick={onPregameTalk}
                variant="outline"
                className="w-full h-12"
              >
                <Mic className="w-4 h-4 mr-2" />
                Pregame Talk
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Avatar Upload Card */}
        {!hasAvatar && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-card to-card/80 border-2 border-muted shadow-lg h-full">
              <CardContent className="pt-8 pb-6 px-6 text-center flex flex-col h-full">
                {/* Avatar Preview */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.4 }}
                  className="mx-auto mb-6"
                >
                  <Avatar className="w-20 h-20 border-2 border-dashed border-muted-foreground/30">
                    <AvatarFallback className="bg-muted">
                      <User className="w-8 h-8 text-muted-foreground/50" />
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Header */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-4"
                >
                  <h3 className="text-xl font-semibold text-foreground">
                    Add a face to the journey
                  </h3>
                </motion.div>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-muted-foreground mb-8 leading-relaxed text-sm flex-1"
                >
                  This helps your Hoop Journal player card feel like you.
                  Upload a photo to see your avatar.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col gap-3 mt-auto"
                >
                  <Button
                    onClick={onUploadPhoto}
                    className="w-full h-12 gradient-primary"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload a photo
                  </Button>
                  <Button
                    onClick={onSkipPhoto}
                    variant="ghost"
                    className="w-full h-12 text-muted-foreground"
                  >
                    Skip for now
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Motivational subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-muted-foreground mt-6 text-center"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        "Every expert was once a beginner."
      </motion.p>
    </motion.div>
  );
}
