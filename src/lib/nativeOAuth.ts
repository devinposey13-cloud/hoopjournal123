/**
 * Native OAuth helper for Despia apps.
 *
 * Despia uses its own secure browser bridge via despia('oauth://?url=...').
 * When the callback page redirects to hoopjournal://oauth/..., Despia closes
 * the browser session and routes the WebView to the matching in-app path.
 */

import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

// Re-export for backward compatibility
export { NATIVE_URL_SCHEME } from '@/lib/authConfig';

/**
 * Open OAuth in the secure native browser session.
 * On Despia native: uses despia-native with oauth:// bridge.
 * On web (non-native custom domain): redirects the window.
 */
export async function openOAuthInSystemBrowser(brokerUrl: string): Promise<void> {
  if (!isNativeApp()) {
    window.location.href = brokerUrl;
    return;
  }

  try {
    const mod = await import('despia-native');
    const despia = (mod.default || mod) as (url: string) => unknown;
    const nativeOauthUrl = `oauth://?url=${encodeURIComponent(brokerUrl)}`;

    console.log('[NativeOAuth] Opening Despia OAuth bridge...');
    despia(nativeOauthUrl);
  } catch (err) {
    console.error('[NativeOAuth] Failed to open Despia OAuth bridge:', err);
    toast.error('Unable to open Google sign-in. Please update the app and try again.');
    throw new Error('Despia OAuth bridge unavailable');
  }
}

/**
 * Legacy no-op listener retained for compatibility.
 * Despia handles OAuth return by navigating the WebView to /auth/callback.
 */
export async function setupNativeOAuthListener(
  _onTokens: (accessToken: string, refreshToken: string) => Promise<void>,
  _onError: (error: string) => void
): Promise<(() => void) | null> {
  if (!isNativeApp()) return null;

  console.log('[NativeOAuth] Despia OAuth uses WebView route handoff; no native listener required');
  return null;
}

