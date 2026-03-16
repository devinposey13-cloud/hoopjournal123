/**
 * Platform detection utilities for Capacitor / native app detection.
 */

import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

function getWindowPlatform(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.Capacitor?.isNativePlatform?.()) {
    return window.Capacitor.getPlatform?.() ?? null;
  }
  if (window.Capacitor?.getPlatform) {
    return window.Capacitor.getPlatform();
  }
  return null;
}

/** Returns the current platform: 'ios', 'android', or 'web'. */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const runtimePlatform = Capacitor.getPlatform?.();
  if (runtimePlatform === 'ios' || runtimePlatform === 'android') return runtimePlatform;

  const windowPlatform = getWindowPlatform();
  if (windowPlatform === 'ios' || windowPlatform === 'android') return windowPlatform;

  if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') {
    return 'ios';
  }

  return 'web';
}

/** Returns true when running inside a Capacitor native shell (iOS / Android). */
export function isNativeApp(): boolean {
  if (Capacitor.isNativePlatform?.()) return true;
  return getPlatform() !== 'web';
}

/** Returns true when running on iOS (native). */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
