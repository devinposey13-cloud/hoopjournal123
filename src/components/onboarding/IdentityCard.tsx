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
        className="text-3xl md:text-4xl mb-4 text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Who's the hooper?
      </h2>
      
      <p className="text-muted-foreground mb-8 text-sm">
        This is how Coach AI will talk to you.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
        <Input
          type="text"
          placeholder="Your name or nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-center text-lg h-14 bg-card border-2 focus:border-primary"
          autoFocus
        />
        
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
