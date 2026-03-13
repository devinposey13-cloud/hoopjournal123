import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FamilyCardProps {
  value: string;
  onNext: (email: string | null) => void;
}

export function FamilyCard({ value, onNext }: FamilyCardProps) {
  const [email, setEmail] = useState(value);
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(email.trim() || null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <h2 
        className="text-4xl md:text-5xl mb-4 text-foreground uppercase tracking-wide"
        style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}
      >
        Share this journey with family?
      </h2>
      
      <p className="text-muted-foreground mb-8 text-sm">
        No pressure — totally optional.
      </p>

      {!showInput ? (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setShowInput(true)}
            className="p-4 rounded-xl border-2 border-border transition-all duration-200 hover:scale-[1.02] hover:border-primary bg-card"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="font-semibold text-foreground">Add parent email</div>
            <div className="text-sm text-muted-foreground">Share updates with family</div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => onNext(null)}
            className="p-4 rounded-xl border-2 border-border transition-all duration-200 hover:scale-[1.02] hover:border-muted bg-card"
          >
            <div className="font-semibold text-foreground">Skip for now</div>
            <div className="text-sm text-muted-foreground">You can add this later</div>
          </motion.button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="email"
            placeholder="parent@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-center text-lg h-14 bg-card border-2 focus:border-primary"
            autoFocus
          />
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInput(false)}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 gradient-primary"
            >
              {email.trim() ? 'Continue' : 'Skip'}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
