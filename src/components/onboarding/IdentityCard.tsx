import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IdentityCardProps {
  value: string;
  onNext: (name: string) => void;
}

export function IdentityCard({ value, onNext }: IdentityCardProps) {
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
      <h2 
        className="text-3xl md:text-4xl mb-3 text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Let's personalize your Coach
      </h2>
      
      <p className="text-muted-foreground mb-6 text-sm max-w-xs">
        Answer a few quick questions so your Coach can give smarter feedback.
        <br />
        <span className="text-xs opacity-75">Takes under 60 seconds.</span>
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="text-left">
          <label className="text-sm font-medium text-foreground mb-2 block">
            What should your Coach call you?
          </label>
          <Input
            type="text"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center text-lg h-14 bg-card border-2 focus:border-primary"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            This helps your Coach speak to you like a real person — not a generic assistant.
          </p>
        </div>
        
        <Button
          type="submit"
          disabled={!name.trim()}
          className="w-full h-12 text-lg gradient-primary"
        >
          Continue
        </Button>
      </form>
    </motion.div>
  );
}
