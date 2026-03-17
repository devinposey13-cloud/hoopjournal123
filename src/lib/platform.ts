/**
 * Platform detection utilities — Despia-native runtime.
 *
 * Despia apps are identified by their user-agent string.
 * Web = anything that is NOT running inside a Despia shell.
 */

declare global {
  interface Window {
    onRevenueCatPurchase?: () => void;
  }
}

function getUA(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent.toLowerCase();
}

/** True when running inside any Despia native shell */
export function isDespia(): boolean {
  return getUA().includes('despia');
}

/** True when running inside Despia on iOS */
export function isDespiaIOS(): boolean {
  const ua = getUA();
  return ua.includes('despia') && (ua.includes('iphone') || ua.includes('ipad'));
}

/** True when running inside Despia on Android */
export function isDespiaAndroid(): boolean {
  const ua = getUA();
  return ua.includes('despia') && ua.includes('android');
}

/** True when running on the regular web (not inside Despia) */
export function isWeb(): boolean {
  return !isDespia();
}

/**
 * Returns the current platform identifier.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (isDespiaIOS()) return 'ios';
  if (isDespiaAndroid()) return 'android';
  return 'web';
}

/**
 * Returns true when running inside a native mobile shell (Despia iOS or Android).
 * Use this to gate native purchase flows vs. web Stripe flows.
 */
export function isNativeApp(): boolean {
  return isDespia();
}

/** Returns true when running on iOS (native shell). */
export function isIOS(): boolean {
  return isDespiaIOS();
}
