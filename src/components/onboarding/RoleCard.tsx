import { motion } from 'framer-motion';

interface RoleCardProps {
  value: string;
  onNext: (role: string) => void;
}

const roles = [
  { id: 'scorer', icon: '🏀', label: 'Scorer', description: 'Put the ball in the bucket' },
  { id: 'playmaker', icon: '🎯', label: 'Playmaker', description: 'Set up teammates for success' },
  { id: 'defender', icon: '🛡️', label: 'Lockdown Defender', description: 'Shut down the opposition' },
  { id: 'energy', icon: '🔥', label: 'Energy Player', description: 'Hustle and heart every play' },
];

export function RoleCard({ value, onNext }: RoleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center text-center px-6"
    >
      <h2 
        className="text-3xl md:text-4xl mb-2 text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        How do you see yourself
      </h2>
      <h2 
        className="text-3xl md:text-4xl mb-8 text-foreground"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        on the court?
      </h2>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNext(role.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:border-primary bg-card ${
              value === role.id ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <div className="text-3xl mb-2">{role.icon}</div>
            <div className="font-semibold text-foreground">{role.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{role.description}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
