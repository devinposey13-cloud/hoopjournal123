import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface GoalsCardProps {
  value: string[];
  onNext: (goals: string[]) => void;
}

const goals = [
  { id: 'confidence', label: 'More confidence', icon: '💪' },
  { id: 'minutes', label: 'More minutes', icon: '⏱️' },
  { id: 'stats', label: 'Better stats', icon: '📊' },
  { id: 'defense', label: 'Better defense', icon: '🛡️' },
  { id: 'make_team', label: 'Making the team', icon: '✅' },
  { id: 'improve', label: 'Just getting better', icon: '📈' },
];

export function GoalsCard({ value, onNext }: GoalsCardProps) {
  const [selected, setSelected] = useState<string[]>(value);

  const toggleGoal = (goalId: string) => {
    setSelected(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <h2 
        className="text-2xl md:text-3xl mb-2 text-foreground font-semibold"
      >
        What do you want your Coach to help you with most?
      </h2>
      
      <p className="text-muted-foreground mb-5 text-sm">
        Your Coach will prioritize feedback around this.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-4">
        {goals.map((goal, index) => (
          <motion.button
            key={goal.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => toggleGoal(goal.id)}
            className={`p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 bg-card ${
              selected.includes(goal.id) 
                ? 'border-primary bg-primary/10' 
                : 'border-border'
            }`}
          >
            <div className="text-2xl mb-1">{goal.icon}</div>
            <div className="text-sm font-medium text-foreground">{goal.label}</div>
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-4 opacity-75">
        You can change this anytime.
      </p>

      <Button
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
        className="w-full max-w-sm h-12 text-lg gradient-primary"
      >
        Continue
      </Button>
    </motion.div>
  );
}
