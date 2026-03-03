import { motion } from 'framer-motion';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex justify-center items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <motion.div
            key={index}
            layout
            className="rounded-full"
            initial={false}
            animate={{
              width: isActive ? 24 : 10,
              height: 10,
              backgroundColor: isCompleted
                ? 'hsl(var(--primary))'
                : isActive
                  ? 'hsl(var(--primary) / 0.8)'
                  : 'hsl(var(--muted))',
              boxShadow: isActive
                ? '0 0 12px hsl(var(--primary) / 0.4)'
                : '0 0 0px transparent',
            }}
            transition={{
              layout: { type: 'spring', stiffness: 400, damping: 30 },
              backgroundColor: { duration: 0.3 },
              boxShadow: { duration: 0.4 },
            }}
          />
        );
      })}
    </div>
  );
}
