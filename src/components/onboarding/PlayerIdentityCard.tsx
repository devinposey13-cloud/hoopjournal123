import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface PlayerIdentityCardProps {
  roleValue: string;
  levelValue: string;
  onNext: (role: string, level: string) => void;
}

const roles = [
  { id: 'scorer', icon: '🏀', label: 'Scorer', description: 'Put the ball in the bucket' },
  { id: 'playmaker', icon: '🎯', label: 'Playmaker', description: 'Set up teammates for success' },
  { id: 'defender', icon: '🛡️', label: 'Lockdown Defender', description: 'Shut down the opposition' },
  { id: 'energy', icon: '🔥', label: 'Energy Player', description: 'Hustle and heart every play' },
  { id: 'figuring_out', icon: '🤔', label: 'Still figuring it out', description: 'Exploring my game' },
];

const levels = [
  { id: 'middle_school', label: 'Middle School', subtext: 'Grades 6-8' },
  { id: 'freshman_jv', label: 'Freshman / JV', subtext: 'High school development' },
  { id: 'varsity', label: 'Varsity', subtext: 'Top high school level' },
  { id: 'aau_club', label: 'AAU / Club', subtext: 'Travel & competitive ball' },
];

export function PlayerIdentityCard({ roleValue, levelValue, onNext }: PlayerIdentityCardProps) {
  const [selectedRole, setSelectedRole] = useState(roleValue);
  const [selectedLevel, setSelectedLevel] = useState(levelValue);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canContinue = selectedRole && selectedLevel;

  // Check if content is scrollable and show/hide fade hint
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isScrollable = scrollHeight > clientHeight;
        const isNotAtBottom = scrollTop + clientHeight < scrollHeight - 10;
        setShowScrollHint(isScrollable && isNotAtBottom);
      }
    };

    checkScroll();
    const element = scrollRef.current;
    element?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      element?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <div className="relative w-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex flex-col items-center text-center px-6 py-2"
      >
        <div
          ref={scrollRef}
          className="w-full max-h-[70vh] overflow-y-auto scroll-smooth overscroll-contain touch-pan-y pb-4 flex flex-col items-center"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
        {/* Question 1: Player Type */}
        <div className="w-full max-w-sm mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-1">
            How would you describe your game?
          </h3>
          <p className="text-muted-foreground text-xs mb-4">
            This helps your Coach understand your play style.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {roles.map((role, index) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedRole(role.id)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] hover:border-primary bg-card text-left ${
                  selectedRole === role.id ? 'border-primary bg-primary/10' : 'border-border'
                } ${role.id === 'figuring_out' ? 'col-span-2' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{role.icon}</span>
                  <div>
                    <div className="font-medium text-sm text-foreground">{role.label}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Question 2: Skill Level */}
        <div className="w-full max-w-sm mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-1">
            Where are you in your basketball journey?
          </h3>
          <p className="text-muted-foreground text-xs mb-4">
            This helps set the right expectations — not to judge.
          </p>

          <div className="flex flex-col gap-2">
            {levels.map((level, index) => (
              <motion.button
                key={level.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                onClick={() => setSelectedLevel(level.id)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] hover:border-primary bg-card text-left ${
                  selectedLevel === level.id ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                <div className="font-medium text-sm text-foreground">{level.label}</div>
                <div className="text-xs text-muted-foreground">{level.subtext}</div>
              </motion.button>
            ))}
          </div>
        </div>
        </div>

        <Button
          onClick={() => onNext(selectedRole, selectedLevel)}
          disabled={!canContinue}
          className="w-full max-w-sm h-12 text-lg gradient-primary mt-4"
        >
          Continue
        </Button>
      </motion.div>

      {/* Scroll fade hint - only shows when there's more content below */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showScrollHint ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none bg-gradient-to-t from-background via-background/80 to-transparent"
      />
    </div>
  );
}
