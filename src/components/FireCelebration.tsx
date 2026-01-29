import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface FireParticlesProps {
  count?: number;
}

function FireParticles({ count = 200 }: FireParticlesProps) {
  const points = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Spread particles in a cone shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      
      positions[i * 3] = Math.cos(angle) * radius * 0.5;
      positions[i * 3 + 1] = Math.random() * 3 - 1; // Y position
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.5;
      
      // Fire colors: orange to yellow to white
      const colorMix = Math.random();
      if (colorMix < 0.3) {
        // Red/orange core
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0;
      } else if (colorMix < 0.7) {
        // Orange/yellow middle
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
        colors[i * 3 + 2] = 0;
      } else {
        // Yellow/white tips
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.4;
      }
      
      sizes[i] = Math.random() * 0.5 + 0.2;
    }
    
    return { positions, colors, sizes };
  }, [count]);

  useFrame((state, delta) => {
    if (!points.current) return;
    
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Move particles upward
      positions[i * 3 + 1] += delta * (2 + Math.random() * 2);
      
      // Add some horizontal wobble
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 5 + i) * delta * 0.3;
      positions[i * 3 + 2] += Math.cos(state.clock.elapsedTime * 5 + i) * delta * 0.3;
      
      // Reset particles that go too high
      if (positions[i * 3 + 1] > 3) {
        positions[i * 3 + 1] = -1;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate slightly for dynamic effect
    points.current.rotation.y += delta * 0.5;
  });

  return (
    <Points ref={points} positions={particles.positions} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.15}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function GlowSphere() {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 10) * 0.1);
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
    </mesh>
  );
}

interface FireCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

export function FireCelebration({ show, onComplete }: FireCelebrationProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      style={{ background: 'radial-gradient(circle, rgba(255,100,0,0.2) 0%, transparent 70%)' }}
    >
      <div className="w-64 h-80">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <FireParticles count={150} />
          <GlowSphere />
        </Canvas>
      </div>
      
      {/* Fire emoji burst */}
      <div className="absolute inset-0 flex items-center justify-center animate-scale-in">
        <span className="text-8xl animate-pulse">🔥</span>
      </div>
      
      {/* Text overlay */}
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 text-center">
        <p className="text-4xl font-bold text-orange-400 animate-fade-in drop-shadow-[0_0_10px_rgba(255,100,0,0.8)]">
          BUCKET!
        </p>
      </div>
    </div>
  );
}
