import { motion } from 'framer-motion';

interface LevelCardProps {
  value: string;
  onNext: (level: string) => void;
}

const levels = [
  { id: 'middle_school', label: 'Middle School', subtext: 'Grades 6-8' },
  { id: 'freshman_jv', label: 'Freshman / JV', subtext: 'High school development' },
  { id: 'varsity', label: 'Varsity', subtext: 'Top high school level' },
  { id: 'aau_club', label: 'AAU / Club', subtext: 'Travel & competitive ball' },
];

export function LevelCard({ value, onNext }: LevelCardProps) {
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
        What level are you playing at?
      </h2>
      
      <p className="text-muted-foreground mb-8 text-sm">
        This helps Coach AI coach you better.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {levels.map((level, index) => (
          <motion.button
            key={level.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onNext(level.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] hover:border-primary bg-card text-left ${
              value === level.id ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <div className="font-semibold text-foreground">{level.label}</div>
            <div className="text-sm text-muted-foreground">{level.subtext}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
