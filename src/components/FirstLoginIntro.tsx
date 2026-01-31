import { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { RealisticBasketball } from '@/components/RealisticBasketball';
import * as THREE from 'three';

// Camera controller that subtly follows the basketball
function CameraController({ active }: { active: boolean }) {
  const { camera } = useThree();
  const targetY = useRef(1);
  const startTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!active) return;

    if (startTime.current === null) {
      startTime.current = state.clock.elapsedTime;
    }

    const t = state.clock.elapsedTime - startTime.current;
    
    // Calculate ball position (matching RealisticBasketball physics)
    const bounceHeight = Math.abs(Math.sin(t * 3.5)) * Math.exp(-t * 0.4);
    const ballY = bounceHeight * 2.5 - 0.5;
    
    // Smoothly follow the ball with dampening (subtle movement)
    targetY.current = THREE.MathUtils.lerp(targetY.current, 1 + ballY * 0.15, 0.05);
    
    // Update camera position with subtle Y tracking
    camera.position.y = targetY.current;
    
    // Slight horizontal sway for cinematic feel
    camera.position.x = Math.sin(t * 0.3) * 0.2;
    
    // Always look at the ball area
    camera.lookAt(0, ballY * 0.5, 0);
  });

  return null;
}

interface FirstLoginIntroProps {
  onComplete: () => void;
}

// Court floor hint
function CourtFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial 
        color="hsl(30, 50%, 25%)"
        roughness={0.9}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

// Spotlight effect
function Spotlight({ visible }: { visible: boolean }) {
  if (!visible) return null;
  
  return (
    <spotLight
      position={[0, 5, 2]}
      angle={0.6}
      penumbra={0.5}
      intensity={2}
      color="hsl(40, 100%, 90%)"
      castShadow
    />
  );
}

export function FirstLoginIntro({ onComplete }: FirstLoginIntroProps) {
  const { playSound, preloadIntroSounds } = useSoundEffects();
  const [phase, setPhase] = useState(0);
  // Phase 0: Dark fade-in
  // Phase 1: Basketball bouncing
  // Phase 2: Stats flash
  // Phase 3: Spotlight + text
  // Phase 4: Button appears

  useEffect(() => {
    // Preload AI-generated sounds in the background
    preloadIntroSounds();
    
    // Phase timing
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Start bounce at 1s
    timers.push(setTimeout(() => {
      setPhase(1);
      playSound('bounce_echo');
    }, 1000));

    // Phase 2: Stats flash at 3s
    timers.push(setTimeout(() => {
      setPhase(2);
    }, 3000));

    // Phase 3: Spotlight + text at 5s
    timers.push(setTimeout(() => {
      setPhase(3);
      playSound('arena_ambience');
    }, 5000));

    // Phase 4: Button at 6.5s
    timers.push(setTimeout(() => {
      setPhase(4);
    }, 6500));

    return () => timers.forEach(clearTimeout);
  }, [playSound, preloadIntroSounds]);

  const handleComplete = () => {
    playSound('net_swoosh');
    // Small delay to let sound play before transitioning
    setTimeout(onComplete, 300);
  };

  const stats = [
    { label: 'PTS', delay: 0 },
    { label: 'REB', delay: 0.2 },
    { label: 'AST', delay: 0.4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[hsl(220,20%,6%)] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 3D Canvas for basketball */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
          <CameraController active={phase >= 1} />
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.5} />
          <Spotlight visible={phase >= 3} />
          <Suspense fallback={null}>
            <RealisticBasketball startBounce={phase >= 1} />
            <CourtFloor />
          </Suspense>
          
          {/* Cinematic post-processing effects */}
          <EffectComposer>
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.05}
              bokehScale={3}
            />
            <Vignette darkness={0.5} offset={0.3} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Stat flash overlays */}
      <AnimatePresence>
        {phase >= 2 && phase < 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex gap-16 md:gap-24">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: [0, 0.6, 0],
                    scale: [0.5, 1.3, 1],
                  }}
                  transition={{ 
                    delay: stat.delay,
                    duration: 1.2,
                    ease: 'easeOut',
                  }}
                  className="text-5xl md:text-7xl font-black text-primary/40 select-none"
                >
                  {stat.label}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Spotlight radial gradient overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 3 ? 0.3 : 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center 40%, hsl(40, 100%, 70%) 0%, transparent 50%)',
        }}
      />

      {/* Text and Button Container */}
      <div className="relative z-10 text-center mt-32 md:mt-40 px-4">
        <AnimatePresence>
          {phase >= 3 && (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-3xl md:text-5xl lg:text-6xl text-foreground/90 mb-8"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              Every game tells a story.
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <Button
                onClick={handleComplete}
                size="lg"
                className="gradient-primary text-lg px-8 py-6 rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                Start My Journey
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip button (subtle) */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        whileHover={{ opacity: 0.8 }}
        transition={{ delay: 2 }}
        onClick={onComplete}
        className="absolute bottom-8 right-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip →
      </motion.button>
    </motion.div>
  );
}
