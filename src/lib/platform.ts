/**
 * Platform detection utilities for Capacitor / native app detection.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

/** Returns true when running inside a Capacitor native shell (iOS / Android). */
export function isNativeApp(): boolean {
  return !!window.Capacitor?.isNativePlatform?.();
}

/** Returns the current platform: 'ios', 'android', or 'web'. */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (!window.Capacitor) return 'web';
  const p = window.Capacitor.getPlatform();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  return 'web';
}

/** Returns true when running on iOS (native). */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
