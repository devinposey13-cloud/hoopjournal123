import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface HabitHookCardProps {
  value: string;
  onNext: (frequency: string) => void;
}

const frequencies = [
  { id: 'every_game', label: 'After every game', icon: '🏀', description: 'Most detailed tracking' },
  { id: 'weekly', label: 'Weekly', icon: '📅', description: 'Steady habit building' },
  { id: 'whenever', label: 'Whenever I remember', icon: '💭', description: 'No pressure at all' },
];

export function HabitHookCard({ value, onNext }: HabitHookCardProps) {
  const [selected, setSelected] = useState(value);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6 max-h-[85vh] overflow-y-auto overscroll-contain touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <h2 className="text-2xl md:text-3xl mb-2 text-foreground font-semibold">
        How often do you want to log?
      </h2>

      <p className="text-muted-foreground mb-6 text-sm">
        No pressure. Start small.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
        {frequencies.map((freq, index) => (
          <motion.button
            key={freq.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => setSelected(freq.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] hover:border-primary bg-card text-left ${
              selected === freq.id ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{freq.icon}</span>
              <div>
                <div className="font-medium text-sm text-foreground">{freq.label}</div>
                <div className="text-xs text-muted-foreground">{freq.description}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <Button
        onClick={() => onNext(selected)}
        disabled={!selected}
        className="w-full max-w-sm h-12 text-lg gradient-primary"
      >
        Next
      </Button>
    </motion.div>
  );
}
