import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface RealisticBasketballProps {
  startBounce: boolean;
}

// Dust particle system for impact effects
function ImpactParticles({ trigger }: { trigger: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 30;
  const lastTrigger = useRef(0);
  const activeRef = useRef(false);
  const startTimeRef = useRef(0);
  
  const { positions, velocities, initialPositions } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const initialPositions: THREE.Vector3[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Start at ground level
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -0.5;
      positions[i * 3 + 2] = 0;
      
      // Random outward velocity
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 0.5 + Math.random() * 1.5;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        1 + Math.random() * 2, // Upward
        Math.sin(angle) * speed
      ));
      initialPositions.push(new THREE.Vector3(0, -0.5, 0));
    }
    
    return { positions, velocities, initialPositions };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state) => {
    if (!particlesRef.current) return;
    
    // Check for new trigger
    if (trigger !== lastTrigger.current && trigger > 0) {
      lastTrigger.current = trigger;
      activeRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
      
      // Reset positions
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArray[i * 3] = 0;
        posArray[i * 3 + 1] = -0.5;
        posArray[i * 3 + 2] = 0;
      }
    }
    
    if (!activeRef.current) return;
    
    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const duration = 0.8;
    
    if (elapsed > duration) {
      activeRef.current = false;
      particlesRef.current.visible = false;
      return;
    }
    
    particlesRef.current.visible = true;
    const progress = elapsed / duration;
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const vel = velocities[i];
      // Physics with gravity
      posArray[i * 3] = vel.x * elapsed * 0.5;
      posArray[i * 3 + 1] = -0.5 + vel.y * elapsed * 0.3 - 2 * elapsed * elapsed;
      posArray[i * 3 + 2] = vel.z * elapsed * 0.5;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Fade out
    const material = particlesRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - progress;
  });

  return (
    <points ref={particlesRef} visible={false}>
      <bufferGeometry attach="geometry" {...geometry} />
      <pointsMaterial
        size={0.08}
        color="#c4a574"
        transparent
        opacity={1}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Light ray burst effect
function LightBurst({ trigger }: { trigger: number }) {
  const raysRef = useRef<THREE.Group>(null);
  const lastTrigger = useRef(0);
  const activeRef = useRef(false);
  const startTimeRef = useRef(0);
  const rayCount = 8;

  useFrame((state) => {
    if (!raysRef.current) return;
    
    if (trigger !== lastTrigger.current && trigger > 0) {
      lastTrigger.current = trigger;
      activeRef.current = true;
      startTimeRef.current = state.clock.elapsedTime;
    }
    
    if (!activeRef.current) {
      raysRef.current.visible = false;
      return;
    }
    
    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const duration = 0.4;
    
    if (elapsed > duration) {
      activeRef.current = false;
      raysRef.current.visible = false;
      return;
    }
    
    raysRef.current.visible = true;
    const progress = elapsed / duration;
    
    // Scale up and fade out
    const scale = 0.5 + progress * 2;
    raysRef.current.scale.set(scale, scale, scale);
    
    raysRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.6;
      }
    });
  });

  return (
    <group ref={raysRef} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      {Array.from({ length: rayCount }).map((_, i) => {
        const angle = (i / rayCount) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.05, 0.8]} />
            <meshBasicMaterial
              color="#ffa726"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Generate procedural leather texture using canvas
function createLeatherTexture(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base orange color
  ctx.fillStyle = '#e85d04';
  ctx.fillRect(0, 0, size, size);

  // Add leather grain using noise
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.6));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.3));
  }

  ctx.putImageData(imageData, 0, 0);

  // Add pebble pattern
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 3 + 1;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? '#c54b00' : '#ff7b2e';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate bump map for leather texture
function createBumpMap(size: number = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base gray
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Add bump details
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 60;
    const value = 128 + noise;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);

  // Add pebble bumps
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 4 + 1;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#808080');
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate basketball seam curves (8-panel layout)
function generateSeamPoints(): THREE.Vector3[][] {
  const seams: THREE.Vector3[][] = [];
  const radius = 0.62; // Slightly larger than ball for visibility
  const segments = 64;

  // Horizontal seam (equator)
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

  // Vertical seam (front-back)
  const verticalSeam1: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    verticalSeam1.push(new THREE.Vector3(
      0,
      Math.sin(angle) * radius,
      Math.cos(angle) * radius
    ));
  }
  seams.push(verticalSeam1);

  // Vertical seam (left-right)
  const verticalSeam2: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    verticalSeam2.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ));
  }
  seams.push(verticalSeam2);

  // Curved seams for 8-panel effect
  const curveSeam1: THREE.Vector3[] = [];
  const curveSeam2: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI;
    const wave = Math.sin(t * 2) * 0.15;
    
    curveSeam1.push(new THREE.Vector3(
      Math.cos(t) * radius * (1 + wave * 0.1),
      Math.sin(t) * radius * 0.5 + wave,
      Math.sin(t) * radius * 0.866
    ));
    
    curveSeam2.push(new THREE.Vector3(
      Math.cos(t) * radius * (1 + wave * 0.1),
      Math.sin(t) * radius * 0.5 + wave,
      -Math.sin(t) * radius * 0.866
    ));
  }
  seams.push(curveSeam1);
  seams.push(curveSeam2);

  return seams;
}

export function RealisticBasketball({ startBounce }: RealisticBasketballProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef<number | null>(null);
  const [impactTrigger, setImpactTrigger] = useState(0);
  const lastImpactRef = useRef(0);

  // Create textures
  const { colorMap, bumpMap, seams } = useMemo(() => ({
    colorMap: createLeatherTexture(),
    bumpMap: createBumpMap(),
    seams: generateSeamPoints(),
  }), []);

  // Cleanup textures
  useEffect(() => {
    return () => {
      colorMap.dispose();
      bumpMap.dispose();
    };
  }, [colorMap, bumpMap]);

  useFrame((state) => {
    if (!groupRef.current || !startBounce) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const t = state.clock.elapsedTime - startTimeRef.current;
    
    // Bouncing physics with damping
    const bounceHeight = Math.abs(Math.sin(t * 3.5)) * Math.exp(-t * 0.4);
    const yPos = bounceHeight * 2.5 - 0.5;
    groupRef.current.position.y = yPos;
    
    // Detect ground impact for particle effects
    const impactThreshold = -0.35;
    const isImpacting = yPos < impactThreshold;
    const timeSinceLastImpact = t - lastImpactRef.current;
    
    if (isImpacting && timeSinceLastImpact > 0.3) {
      lastImpactRef.current = t;
      setImpactTrigger(prev => prev + 1);
    }
    
    // Squash effect on impact
    const squashFactor = yPos < -0.3 ? 0.85 + (yPos + 0.5) * 0.5 : 1;
    const stretchFactor = yPos < -0.3 ? 1.15 - (yPos + 0.5) * 0.5 : 1;
    
    if (meshRef.current) {
      meshRef.current.scale.set(stretchFactor, squashFactor, stretchFactor);
    }
    
    // Rotation while bouncing
    groupRef.current.rotation.x += 0.025;
    groupRef.current.rotation.z += 0.008;
  });

  return (
    <>
      {/* Environment for realistic reflections */}
      <Environment preset="warehouse" />
      
      {/* Impact effects */}
      <ImpactParticles trigger={impactTrigger} />
      <LightBurst trigger={impactTrigger} />
      
      <group ref={groupRef} position={[0, 3, 0]}>
        {/* Main basketball sphere */}
        <mesh ref={meshRef} castShadow>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshPhysicalMaterial
            map={colorMap}
            bumpMap={bumpMap}
            bumpScale={0.015}
            roughness={0.75}
            metalness={0.05}
            clearcoat={0.1}
            clearcoatRoughness={0.8}
            envMapIntensity={0.4}
          />
        </mesh>

        {/* Seam lines */}
        {seams.map((seamPoints, index) => (
          <Line
            key={index}
            points={seamPoints}
            color="#1a0a00"
            lineWidth={2}
          />
        ))}
      </group>
    </>
  );
}
