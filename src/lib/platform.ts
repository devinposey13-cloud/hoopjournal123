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
  // Primary check: Capacitor bridge
  if (window.Capacitor?.isNativePlatform?.()) return true;
  // Fallback: check for Capacitor object presence (bridge may not have fully initialised)
  if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') return true;
  // Fallback: check for capacitor:// scheme used in iOS WebView
  if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') return true;
  return false;
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
