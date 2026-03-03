import { motion } from 'framer-motion';
import { useMemo } from 'react';

const ORBS = [
  { size: 280, x: '15%', y: '20%', duration: 18, delay: 0 },
  { size: 220, x: '75%', y: '65%', duration: 22, delay: 2 },
  { size: 160, x: '60%', y: '15%', duration: 16, delay: 4 },
  { size: 200, x: '25%', y: '75%', duration: 20, delay: 1 },
];

export function OnboardingBackground() {
  const orbs = useMemo(() => ORBS, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Radial gradient base — stronger in dark, softer in light */}
      <div className="absolute inset-0 dark:opacity-100 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
        }}
      />

      {/* Floating orbs — use CSS variables so they adapt to theme */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full dark:opacity-100 opacity-50 ${
            i % 2 === 0
              ? 'bg-[radial-gradient(circle,hsl(var(--primary)/0.10)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,transparent_70%)]'
              : 'bg-[radial-gradient(circle,hsl(var(--accent)/0.08)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,hsl(var(--accent)/0.10)_0%,transparent_70%)]'
          }`}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            filter: 'blur(40px)',
            willChange: 'transform',
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Grain texture — visible in dark, near-invisible in light */}
      <div
        className="absolute inset-0 dark:opacity-[0.025] opacity-[0.01]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
