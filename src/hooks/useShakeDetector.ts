import { useEffect, useRef, useCallback } from 'react';

interface ShakeDetectorOptions {
  threshold?: number; // Acceleration threshold to trigger shake
  timeout?: number; // Cooldown between shakes in ms
  onShake: () => void;
}

export function useShakeDetector({
  threshold = 15,
  timeout = 1000,
  onShake,
}: ShakeDetectorOptions) {
  const lastShakeTime = useRef(0);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const isEnabled = useRef(true);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isEnabled.current) return;
    
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
      return;
    }

    const { x, y, z } = acceleration;
    const last = lastAcceleration.current;
    
    // Calculate acceleration delta
    const deltaX = Math.abs(x - last.x);
    const deltaY = Math.abs(y - last.y);
    const deltaZ = Math.abs(z - last.z);
    
    // Update last acceleration
    lastAcceleration.current = { x: x || 0, y: y || 0, z: z || 0 };
    
    // Check if shake threshold is exceeded
    const totalDelta = deltaX + deltaY + deltaZ;
    
    if (totalDelta > threshold) {
      const now = Date.now();
      
      // Enforce cooldown period
      if (now - lastShakeTime.current > timeout) {
        lastShakeTime.current = now;
        onShake();
      }
    }
  }, [threshold, timeout, onShake]);

  const requestPermission = useCallback(async () => {
    // Check if DeviceMotionEvent exists and has requestPermission (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.warn('Motion permission denied:', error);
        return false;
      }
    }
    // Android and older iOS don't require permission
    return true;
  }, []);

  const enable = useCallback(() => {
    isEnabled.current = true;
  }, []);

  const disable = useCallback(() => {
    isEnabled.current = false;
  }, []);

  useEffect(() => {
    // Check if DeviceMotionEvent is supported
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      return;
    }

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [handleMotion]);

  return { requestPermission, enable, disable };
}
