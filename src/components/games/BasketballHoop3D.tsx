import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BasketballHoop3DProps {
  gameState: 'ready' | 'playing' | 'shooting' | 'result' | 'finished';
  shotResult: 'made' | 'missed' | null;
  power: number;
}

// Basketball component with animation
function Basketball({ 
  isShooting, 
  shotResult, 
  power 
}: { 
  isShooting: boolean; 
  shotResult: 'made' | 'missed' | null;
  power: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const startPosition = useMemo(() => new THREE.Vector3(0, -2, 2), []);
  
  // Calculate trajectory based on power (sweet spot is 50)
  const trajectoryParams = useMemo(() => {
    const accuracy = 1 - Math.abs(power - 50) / 50; // 1 = perfect, 0 = worst
    return {
      accuracy,
      // Higher arc for better shots
      arcHeight: 2 + accuracy * 1.5,
      // Slight horizontal offset for misses
      xOffset: shotResult === 'missed' ? (Math.random() - 0.5) * 0.8 : 0,
    };
  }, [power, shotResult]);

  useEffect(() => {
    if (isShooting) {
      setAnimationProgress(0);
    }
  }, [isShooting]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isShooting && animationProgress < 1) {
      // Animate the shot
      const newProgress = Math.min(animationProgress + delta * 2, 1);
      setAnimationProgress(newProgress);

      // Parabolic arc trajectory
      const t = newProgress;
      const x = startPosition.x + trajectoryParams.xOffset * t;
      const z = startPosition.z - t * (startPosition.z + 0.5); // Move toward hoop
      
      // Parabolic height: starts low, peaks, then drops
      const arcHeight = trajectoryParams.arcHeight;
      const y = startPosition.y + (4 * arcHeight * t * (1 - t)) + t * 2;
      
      meshRef.current.position.set(x, y, z);
      
      // Spin the ball
      meshRef.current.rotation.x += delta * 10;
      meshRef.current.rotation.z += delta * 3;
    } else if (shotResult && animationProgress >= 1) {
      // Post-shot animation
      if (shotResult === 'made') {
        // Ball falls through the net
        meshRef.current.position.y -= delta * 3;
        meshRef.current.rotation.x += delta * 2;
      } else {
        // Ball bounces away
        meshRef.current.position.x += delta * (trajectoryParams.xOffset > 0 ? 2 : -2);
        meshRef.current.position.y -= delta * 4;
        meshRef.current.rotation.x += delta * 5;
      }
    } else if (!isShooting && !shotResult) {
      // Reset position
      meshRef.current.position.copy(startPosition);
      meshRef.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <mesh ref={meshRef} position={startPosition}>
      <sphereGeometry args={[0.24, 32, 32]} />
      <meshStandardMaterial 
        color="#ff6b00" 
        roughness={0.8}
        metalness={0.1}
      />
      {/* Basketball lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.SphereGeometry(0.245, 8, 4)]} />
        <lineBasicMaterial color="#1a1a1a" linewidth={2} />
      </lineSegments>
    </mesh>
  );
}

// Net component with physics-like animation
function Net({ isSwishing }: { isSwishing: boolean }) {
  const netRef = useRef<THREE.Group>(null);
  const [swishProgress, setSwishProgress] = useState(0);

  useEffect(() => {
    if (isSwishing) {
      setSwishProgress(1);
    }
  }, [isSwishing]);

  useFrame((_, delta) => {
    if (swishProgress > 0) {
      setSwishProgress(Math.max(0, swishProgress - delta * 2));
    }
  });

  // Create net rings
  const netRings = useMemo(() => {
    const rings = [];
    const numRings = 6;
    for (let i = 0; i < numRings; i++) {
      const radius = 0.45 - i * 0.05;
      const y = -i * 0.12;
      rings.push({ radius, y, key: i });
    }
    return rings;
  }, []);

  return (
    <group ref={netRef} position={[0, 0.9, 0]}>
      {netRings.map((ring) => {
        const wobble = Math.sin(swishProgress * Math.PI * 3 + ring.key) * swishProgress * 0.1;
        return (
          <mesh 
            key={ring.key} 
            position={[wobble, ring.y, wobble]}
            rotation={[0, 0, 0]}
          >
            <torusGeometry args={[ring.radius, 0.015, 8, 16]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={1}
              transparent
              opacity={0.9}
            />
          </mesh>
        );
      })}
      {/* Vertical net strands */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 0.42;
        const z = Math.sin(angle) * 0.42;
        const wobble = Math.sin(swishProgress * Math.PI * 2 + i) * swishProgress * 0.05;
        return (
          <mesh 
            key={`strand-${i}`} 
            position={[x + wobble, -0.35, z + wobble]}
          >
            <cylinderGeometry args={[0.01, 0.01, 0.7, 4]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

// Rim component
function Rim() {
  return (
    <group position={[0, 1, 0]}>
      {/* Main rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.03, 16, 32]} />
        <meshStandardMaterial 
          color="#ff4500" 
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      {/* Rim connector to backboard */}
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
        <meshStandardMaterial 
          color="#ff4500" 
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// Backboard component
function Backboard() {
  return (
    <group position={[0, 1.8, -0.6]}>
      {/* Main backboard */}
      <mesh>
        <boxGeometry args={[1.8, 1.2, 0.05]} />
        <meshStandardMaterial 
          color="#e8e8e8"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Red target square */}
      <mesh position={[0, -0.15, 0.03]}>
        <boxGeometry args={[0.6, 0.45, 0.01]} />
        <meshStandardMaterial 
          color="#ff0000"
          transparent
          opacity={0.3}
        />
      </mesh>
      {/* Target square outline */}
      <lineSegments position={[0, -0.15, 0.04]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.6, 0.45, 0.001)]} />
        <lineBasicMaterial color="#ff0000" linewidth={2} />
      </lineSegments>
      {/* Backboard support pole */}
      <mesh position={[0, 0.8, -0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

// Main scene component
function HoopScene({ gameState, shotResult, power }: BasketballHoop3DProps) {
  const isShooting = gameState === 'shooting' || gameState === 'result';
  const isSwishing = gameState === 'result' && shotResult === 'made';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <spotLight 
        position={[0, 8, 5]} 
        angle={0.5} 
        penumbra={0.5} 
        intensity={1.5}
        castShadow
      />
      <pointLight position={[-3, 3, 3]} intensity={0.3} color="#ffaa00" />
      
      {/* Court floor hint */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial 
          color="#2d1810" 
          roughness={0.8}
        />
      </mesh>
      
      {/* Hoop assembly */}
      <group position={[0, 0.5, -1]}>
        <Backboard />
        <Rim />
        <Net isSwishing={isSwishing} />
      </group>
      
      {/* Basketball */}
      <Basketball 
        isShooting={isShooting} 
        shotResult={shotResult}
        power={power}
      />
    </>
  );
}

export function BasketballHoop3D({ gameState, shotResult, power }: BasketballHoop3DProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Fallback if 3D fails
    return null;
  }

  return (
    <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden bg-gradient-to-b from-secondary/50 to-secondary">
      <Canvas
        camera={{ position: [0, 1, 6], fov: 45 }}
        onCreated={() => {}}
        onError={() => setHasError(true)}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <HoopScene gameState={gameState} shotResult={shotResult} power={power} />
      </Canvas>
    </div>
  );
}
