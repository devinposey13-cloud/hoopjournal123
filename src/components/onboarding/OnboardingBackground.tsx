import { motion } from 'framer-motion';
import { useMemo } from 'react';

const ORBS = [
  { size: 280, x: '15%', y: '20%', color: 'hsl(var(--primary) / 0.08)', duration: 18, delay: 0 },
  { size: 220, x: '75%', y: '65%', color: 'hsl(var(--primary) / 0.06)', duration: 22, delay: 2 },
  { size: 160, x: '60%', y: '15%', color: 'hsl(var(--accent) / 0.07)', duration: 16, delay: 4 },
  { size: 200, x: '25%', y: '75%', color: 'hsl(var(--accent) / 0.05)', duration: 20, delay: 1 },
];

export function OnboardingBackground() {
  const orbs = useMemo(() => ORBS, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Soft radial gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
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

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
