import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import * as THREE from 'three';

// ============================================
// CINEMATIC INTRO - NBA 2K / Nike Training Style
// Total Duration: ~6.5 seconds
// ============================================
// Beat 1: 0-1s     - Fade from black, court lines appear
// Beat 2: 1-2.5s   - Basketball drops, single slow-motion bounce
// Beat 3: 2.5-3.5s - Stats flash briefly (PTS | AST | REB)
// Beat 4: 3.5-5s   - Lights come up, reveal court
// Beat 5: 5-6s     - Text fades in
// Beat 6: 6s+      - Button appears
// ============================================

// Procedural basketball leather texture
function createLeatherTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep orange-brown color for premium look
  ctx.fillStyle = '#d35400';
  ctx.fillRect(0, 0, size, size);

  // Leather grain
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 25;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.5));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.2));
  }

  ctx.putImageData(imageData, 0, 0);

  // Pebble pattern
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 2.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? '#b34700' : '#e86100';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate basketball seam lines
function generateSeamPoints(): THREE.Vector3[][] {
  const seams: THREE.Vector3[][] = [];
  const radius = 0.52;
  const segments = 48;

  // Horizontal seam
  const horizontalSeam: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    horizontalSeam.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ));
  }
  seams.push(horizontalSeam);

  // Vertical seams
  const verticalSeam1: THREE.Vector3[] = [];
  const verticalSeam2: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    verticalSeam1.push(new THREE.Vector3(0, Math.sin(angle) * radius, Math.cos(angle) * radius));
    verticalSeam2.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
  }
  seams.push(verticalSeam1);
  seams.push(verticalSeam2);

  return seams;
}

// Seam line component using primitive
function SeamLine({ points }: { points: THREE.Vector3[] }) {
  const lineRef = useRef<THREE.Line>(null);
  
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#1a0800' });
    return { geometry: geo, material: mat };
  }, [points]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />
}

// Single realistic basketball with slow-motion physics
function CinematicBasketball({ phase }: { phase: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasBounced = useRef(false);

  const { colorMap, seams } = useMemo(() => ({
    colorMap: createLeatherTexture(),
    seams: generateSeamPoints(),
  }), []);

  useEffect(() => {
    return () => colorMap.dispose();
  }, [colorMap]);

  useFrame((state) => {
    if (!groupRef.current || phase < 1) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    
    // Slow-motion single bounce physics
    // Drop from y=3 to y=0 (ground at -0.5), single bounce
    const dropDuration = 1.2; // Slow motion drop
    const bounceDuration = 0.8; // Slow motion rise
    
    let yPos = 2.5; // Start position (will be adjusted)
    let squash = 1;
    let stretch = 1;
    
    if (elapsed < dropDuration) {
      // Dropping phase - ease in (accelerate)
      const t = elapsed / dropDuration;
      const eased = t * t; // Quadratic ease-in
      yPos = 2.5 - (eased * 3); // Drop from 2.5 to -0.5
      
      // Slight stretch while falling
      stretch = 1 + t * 0.08;
      squash = 1 - t * 0.04;
    } else if (elapsed < dropDuration + 0.1) {
      // Impact moment - squash
      const impactT = (elapsed - dropDuration) / 0.1;
      yPos = -0.5;
      squash = 1 - impactT * 0.25;
      stretch = 1 + impactT * 0.15;
      hasBounced.current = true;
    } else if (elapsed < dropDuration + 0.1 + bounceDuration) {
      // Rising phase - ease out (decelerate)
      const t = (elapsed - dropDuration - 0.1) / bounceDuration;
      const eased = 1 - (1 - t) * (1 - t); // Quadratic ease-out
      yPos = -0.5 + eased * 1.5; // Rise to 1.0
      
      // Return to normal shape
      const returnT = Math.min(t * 3, 1);
      squash = 0.75 + returnT * 0.25;
      stretch = 1.15 - returnT * 0.15;
    } else {
      // Floating gently
      yPos = 1.0 + Math.sin((elapsed - dropDuration - 0.1 - bounceDuration) * 0.8) * 0.05;
    }
    
    groupRef.current.position.y = yPos;
    
    if (meshRef.current) {
      meshRef.current.scale.set(stretch, squash, stretch);
    }
    
    // Very slow rotation for cinematic feel
    groupRef.current.rotation.x += 0.003;
    groupRef.current.rotation.z += 0.001;
  });

  if (phase < 1) return null;

  return (
    <group ref={groupRef} position={[0, 2.5, 0]}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.5, 48, 48]} />
        <meshStandardMaterial
          map={colorMap}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      {seams.map((seamPoints, index) => (
        <SeamLine key={index} points={seamPoints} />
      ))}
    </group>
  );
}

// Subtle court floor with lines
function CourtFloor({ phase }: { phase: number }) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useFrame(() => {
    if (materialRef.current) {
      // Fade in court lines with phase
      const targetOpacity = phase >= 0 ? Math.min((phase + 1) * 0.15, 0.4) : 0;
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        targetOpacity,
        0.05
      );
    }
  });

  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          ref={materialRef}
          color="hsl(25, 40%, 18%)"
          roughness={0.9}
          transparent
          opacity={0}
        />
      </mesh>
      
      {/* Center circle - subtle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color="hsl(0, 0%, 30%)" transparent opacity={phase >= 3 ? 0.3 : 0} />
      </mesh>
      
      {/* Court lines */}
      {phase >= 0 && (
        <group position={[0, -0.48, 0]}>
          {/* Three-point arc hint */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4, 4.03, 64, 1, 0, Math.PI]} />
            <meshBasicMaterial color="hsl(0, 0%, 25%)" transparent opacity={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Cinematic lighting that reveals the scene
function CinematicLighting({ phase }: { phase: number }) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  useFrame(() => {
    if (spotRef.current) {
      // Spotlight intensifies as phase progresses
      const targetIntensity = phase >= 3 ? 3 : phase >= 1 ? 1.5 : 0.3;
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity,
        targetIntensity,
        0.03
      );
    }
    if (ambientRef.current) {
      const targetIntensity = phase >= 3 ? 0.4 : 0.15;
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        targetIntensity,
        0.03
      );
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.15} />
      <spotLight
        ref={spotRef}
        position={[0, 8, 3]}
        angle={0.5}
        penumbra={0.8}
        intensity={0.3}
        color="hsl(35, 80%, 85%)"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 3, -5]} intensity={0.2} color="hsl(220, 30%, 60%)" />
      <pointLight position={[5, 3, -5]} intensity={0.2} color="hsl(220, 30%, 60%)" />
    </>
  );
}

// Camera controller
function CameraController({ phase }: { phase: number }) {
  const { camera } = useThree();
  
  useFrame(() => {
    // Subtle camera movement
    const targetY = phase >= 3 ? 1.2 : 1.5;
    const targetZ = phase >= 3 ? 5.5 : 6;
    
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.02);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.02);
    camera.lookAt(0, 0.5, 0);
  });

  return null;
}

// Fallback for low-end devices
function SimpleFallback({ phase }: { phase: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: phase >= 1 ? 1 : 0.8, 
          opacity: phase >= 1 ? 1 : 0,
          y: phase >= 1 ? [0, -20, 0] : 0
        }}
        transition={{ 
          duration: 1.5, 
          ease: 'easeOut',
          y: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
        }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-2xl"
        style={{
          boxShadow: '0 20px 60px rgba(211, 84, 0, 0.4), inset 0 -4px 20px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
}

interface FirstLoginIntroProps {
  onComplete: () => void;
}

export function FirstLoginIntro({ onComplete }: FirstLoginIntroProps) {
  const { playSound, preloadIntroSounds } = useSoundEffects();
  const { triggerHaptic } = useHapticFeedback();
  const [phase, setPhase] = useState(-1);
  const [useSimpleFallback, setUseSimpleFallback] = useState(false);

  // Detect low-end devices
  useEffect(() => {
    const isLowEnd = 
      !window.WebGLRenderingContext ||
      navigator.hardwareConcurrency < 4 ||
      /Android [4-6]/.test(navigator.userAgent);
    setUseSimpleFallback(isLowEnd);
  }, []);

  useEffect(() => {
    preloadIntroSounds();
    
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 0: Fade in, court lines appear (0s)
    timers.push(setTimeout(() => setPhase(0), 100));

    // Phase 1: Basketball drops (1s)
    timers.push(setTimeout(() => {
      setPhase(1);
    }, 1000));

    // Play bounce sound when ball hits (at ~2.2s)
    timers.push(setTimeout(() => {
      playSound('bounce_echo');
      triggerHaptic('medium');
    }, 2200));

    // Phase 2: Stats flash briefly (2.5s)
    timers.push(setTimeout(() => setPhase(2), 2500));

    // Phase 3: Lights come up (3.5s)
    timers.push(setTimeout(() => {
      setPhase(3);
      playSound('arena_ambience');
    }, 3500));

    // Phase 4: Text appears (5s)
    timers.push(setTimeout(() => setPhase(4), 5000));

    // Phase 5: Button appears (6s)
    timers.push(setTimeout(() => setPhase(5), 6000));

    return () => timers.forEach(clearTimeout);
  }, [playSound, preloadIntroSounds, triggerHaptic]);

  const handleComplete = () => {
    triggerHaptic('success');
    playSound('net_swoosh');
    setTimeout(onComplete, 300);
  };

  const stats = [
    { label: 'PTS', delay: 0 },
    { label: 'AST', delay: 0.15 },
    { label: 'REB', delay: 0.3 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 bg-[hsl(220,15%,5%)] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        {useSimpleFallback ? (
          <SimpleFallback phase={phase} />
        ) : (
          <Canvas 
            camera={{ position: [0, 1.5, 6], fov: 45 }}
            shadows
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: false }}
          >
            <fog attach="fog" args={['hsl(220,15%,5%)', 8, 20]} />
            <CameraController phase={phase} />
            <CinematicLighting phase={phase} />
            <Suspense fallback={null}>
              <CinematicBasketball phase={phase} />
              <CourtFloor phase={phase} />
            </Suspense>
            
            <EffectComposer>
              <Vignette darkness={0.6} offset={0.2} />
              <Bloom 
                intensity={0.3} 
                luminanceThreshold={0.8} 
                luminanceSmoothing={0.9} 
              />
            </EffectComposer>
          </Canvas>
        )}
      </div>

      {/* Stat flash overlays */}
      <AnimatePresence>
        {phase >= 2 && phase < 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex gap-12 md:gap-20">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: [0, 0.5, 0],
                    y: [10, 0, -10],
                  }}
                  transition={{ 
                    delay: stat.delay,
                    duration: 0.8,
                    ease: 'easeOut',
                  }}
                  className="text-4xl md:text-6xl font-light tracking-[0.3em] text-white/30 select-none"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {stat.label}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Warm spotlight gradient overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 3 ? 0.15 : 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at center 40%, hsl(35, 80%, 60%) 0%, transparent 70%)',
        }}
      />

      {/* Text and Button - positioned at bottom third of screen */}
      <div className="absolute bottom-[15%] left-0 right-0 z-10 text-center px-6">
        <AnimatePresence>
          {phase >= 4 && (
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl md:text-4xl lg:text-5xl text-white/90 mb-8 font-light tracking-wide"
              style={{ 
                fontFamily: "'Georgia', 'Times New Roman', serif",
                letterSpacing: '0.05em'
              }}
            >
              Every game tells a story.
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Button
                onClick={handleComplete}
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-base px-10 py-6 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
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
        animate={{ opacity: 0.3 }}
        whileHover={{ opacity: 0.7 }}
        transition={{ delay: 2.5, duration: 0.5 }}
        onClick={onComplete}
        className="absolute bottom-8 right-8 text-xs uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
      >
        Skip
      </motion.button>
    </motion.div>
  );
}
