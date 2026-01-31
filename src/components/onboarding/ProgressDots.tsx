import { motion } from 'framer-motion';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
            index < currentStep 
              ? 'bg-primary' 
              : index === currentStep 
                ? 'bg-primary/60' 
                : 'bg-muted'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ 
            scale: index === currentStep ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
}
