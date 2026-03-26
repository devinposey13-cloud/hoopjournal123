import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen } from 'lucide-react';

interface WelcomeCardProps {
  value: string;
  onNext: (name: string) => void;
  onSkip?: () => void;
  onClaimCard?: () => void;
}

export function WelcomeCard({ value, onNext, onSkip, onClaimCard }: WelcomeCardProps) {
  const [name, setName] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNext(name.trim());
    }
  };

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
        className="mb-5"
      >
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <BookOpen className="w-8 h-8 text-primary-foreground" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold mb-2 text-foreground"
      >
        Welcome to Hoop Journal™
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-muted-foreground mb-6 text-sm max-w-xs leading-relaxed"
      >
        Track your games. Build your habits. Watch yourself improve.
      </motion.p>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="w-full max-w-xs space-y-4"
      >
        <div className="text-left">
          <label className="text-sm font-medium text-foreground mb-2 block">
            What should we call you?
          </label>
          <Input
            type="text"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center text-lg h-14 bg-card border-2 focus:border-primary"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          disabled={!name.trim()}
          className="w-full h-12 text-lg gradient-primary"
        >
          Continue
        </Button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </motion.form>
    </motion.div>
  );
}
