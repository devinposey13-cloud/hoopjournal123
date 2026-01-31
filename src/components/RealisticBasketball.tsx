import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface RealisticBasketballProps {
  startBounce: boolean;
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
