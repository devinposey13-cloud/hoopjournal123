/**
 * Platform detection utilities for Capacitor / native app detection.
 *
 * In TestFlight builds that use a remote server URL (capacitor.config server.url),
 * the @capacitor/core import may report "web" because the native bridge isn't
 * fully injected. We add fallback checks for the iOS WKWebView environment
 * (window.webkit.messageHandlers) which is NEVER present in normal browsers.
 */

import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
    webkit?: {
      messageHandlers?: Record<string, unknown>;
    };
  }
}

/** Returns true when running inside a native iOS WKWebView (Capacitor shell). */
function isIOSWebView(): boolean {
  if (typeof window === 'undefined') return false;
  // WKWebView exposes messageHandlers — normal Safari/Chrome never do
  return !!(window.webkit?.messageHandlers);
}

/** Returns true when running inside a native Android WebView (Capacitor shell). */
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor Android injects a bridge object
  return !!(window as any)._capacitor || /wv\)/.test(navigator.userAgent);
}

function getWindowPlatform(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.Capacitor?.isNativePlatform?.()) {
    return window.Capacitor.getPlatform?.() ?? null;
  }
  if (window.Capacitor?.getPlatform) {
    const p = window.Capacitor.getPlatform();
    if (p && p !== 'web') return p;
  }
  return null;
}

/** Returns the current platform: 'ios', 'android', or 'web'. */
export function getPlatform(): 'ios' | 'android' | 'web' {
  // 1. Official Capacitor runtime (works in local builds)
  try {
    const runtimePlatform = Capacitor.getPlatform?.();
    if (runtimePlatform === 'ios' || runtimePlatform === 'android') return runtimePlatform;
  } catch { /* ignore */ }

  // 2. Window.Capacitor globals
  const windowPlatform = getWindowPlatform();
  if (windowPlatform === 'ios' || windowPlatform === 'android') return windowPlatform;

  // 3. Capacitor protocol scheme
  if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') {
    return 'ios';
  }

  // 4. WebView fallbacks for remote-URL TestFlight/debug builds
  if (isIOSWebView()) return 'ios';
  if (isAndroidWebView()) return 'android';

  return 'web';
}

/** Returns true when running inside a Capacitor native shell (iOS / Android). */
export function isNativeApp(): boolean {
  try {
    if (Capacitor.isNativePlatform?.()) return true;
  } catch { /* ignore */ }
  return getPlatform() !== 'web';
}

/** Returns true when running on iOS (native). */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
