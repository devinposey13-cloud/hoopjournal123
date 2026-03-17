/**
 * Platform detection utilities for Capacitor / native app detection.
 *
 * Important distinction:
 * - "shell" detection answers: are we inside a native WebView container?
 * - "runtime" detection answers: is Capacitor itself currently running on a
 *   native iOS/Android platform rather than its web implementation?
 *
 * RevenueCat native purchases MUST only use the runtime-native signal.
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
    _capacitor?: unknown;
  }
}

/** Returns true when running inside a native iOS WKWebView (Capacitor shell). */
function isIOSWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.webkit?.messageHandlers;
}

/** Returns true when running inside a native Android WebView (Capacitor shell). */
function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window._capacitor || /wv\)/.test(navigator.userAgent);
}

function getWindowPlatform(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      return window.Capacitor.getPlatform?.() ?? null;
    }
    if (window.Capacitor?.getPlatform) {
      const platform = window.Capacitor.getPlatform();
      if (platform && platform !== 'web') return platform;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Strict Capacitor runtime platform.
 * This reflects what the Capacitor bridge itself thinks the platform is.
 */
export function getCapacitorRuntimePlatform(): 'ios' | 'android' | 'web' {
  try {
    const runtimePlatform = Capacitor.getPlatform?.();
    if (runtimePlatform === 'ios' || runtimePlatform === 'android' || runtimePlatform === 'web') {
      return runtimePlatform;
    }
  } catch {
    /* ignore */
  }

  if (typeof window !== 'undefined') {
    try {
      const runtimePlatform = window.Capacitor?.getPlatform?.();
      if (runtimePlatform === 'ios' || runtimePlatform === 'android' || runtimePlatform === 'web') {
        return runtimePlatform;
      }
    } catch {
      /* ignore */
    }
  }

  return 'web';
}

/**
 * Strict native-runtime signal.
 * Use this for native plugins that do not support the web implementation.
 */
export function isCapacitorNativeRuntime(): boolean {
  try {
    if (Capacitor.isNativePlatform?.()) return true;
  } catch {
    /* ignore */
  }

  if (typeof window !== 'undefined') {
    try {
      if (window.Capacitor?.isNativePlatform?.()) return true;
    } catch {
      /* ignore */
    }
  }

  const runtimePlatform = getCapacitorRuntimePlatform();
  return runtimePlatform === 'ios' || runtimePlatform === 'android';
}

/**
 * Heuristic platform detection for the native shell.
 * This can report iOS/Android even before Capacitor's native runtime is ready.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const runtimePlatform = getCapacitorRuntimePlatform();
  if (runtimePlatform === 'ios' || runtimePlatform === 'android') return runtimePlatform;

  const windowPlatform = getWindowPlatform();
  if (windowPlatform === 'ios' || windowPlatform === 'android') return windowPlatform;

  if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') {
    return 'ios';
  }

  if (isIOSWebView()) return 'ios';
  if (isAndroidWebView()) return 'android';

  return 'web';
}

/**
 * Returns true when running inside a Capacitor native shell (iOS / Android).
 * This is intentionally broader than isCapacitorNativeRuntime().
 */
export function isNativeApp(): boolean {
  if (isCapacitorNativeRuntime()) return true;
  return getPlatform() !== 'web';
}

/** Returns true when running on iOS (native shell). */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
