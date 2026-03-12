/**
 * Native OAuth helper for Capacitor apps.
 * 
 * Uses the system browser (SFSafariViewController on iOS) for OAuth
 * so the WebView stays on the local bundle. After OAuth completes,
 * the callback redirects to a custom URL scheme that the app intercepts.
 * 
 * SETUP REQUIRED in the native Xcode/Android Studio project:
 * 1. Install @capacitor/browser and @capacitor/app
 * 2. Add URL scheme in Xcode: Info → URL Types → add scheme "hoopjournal"
 * 3. Run npx cap sync
 */

import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

// Custom URL scheme registered in the native app's Info.plist
export const NATIVE_URL_SCHEME = 'hoopjournal';

/**
 * Open OAuth in the system browser (not the WebView).
 * On native: uses @capacitor/browser (SFSafariViewController).
 * On web (non-native custom domain): redirects the window.
 */
export async function openOAuthInSystemBrowser(brokerUrl: string): Promise<void> {
  if (!isNativeApp()) {
    // Web/PWA — normal redirect is fine
    window.location.href = brokerUrl;
    return;
  }

  // Native path — MUST use system browser, never redirect WebView
  try {
    const { Browser } = await import('@capacitor/browser');
    console.log('[NativeOAuth] Opening system browser for OAuth...');
    await Browser.open({ url: brokerUrl, presentationStyle: 'popover' as any });
  } catch (err) {
    console.error('[NativeOAuth] Failed to open system browser:', err);
    toast.error('Unable to open sign-in browser. Please update the app and try again.');
    // Do NOT fall back to window.location.href on native — Google will block it
    throw new Error('System browser unavailable on native');
  }
}

/**
 * Set up listener for the app being opened via custom URL scheme.
 * URL format: hoopjournal://auth/callback#access_token=...&refresh_token=...
 */
export async function setupNativeOAuthListener(
  onTokens: (accessToken: string, refreshToken: string) => Promise<void>,
  onError: (error: string) => void
): Promise<(() => void) | null> {
  if (!isNativeApp()) return null;

  try {
    const { App } = await import('@capacitor/app');

    const listener = await App.addListener('appUrlOpen', async (event: { url: string }) => {
      console.log('[NativeOAuth] App opened with URL:', event.url);

      try {
        const url = new URL(event.url);

        if (url.pathname.includes('auth/callback') || url.host.includes('auth')) {
          const hashParams = new URLSearchParams(url.hash.replace('#', ''));
          const searchParams = new URLSearchParams(url.search);

          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          const errorParam = hashParams.get('error') || searchParams.get('error');
          const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

          if (errorParam) {
            onError(errorDesc || errorParam);
            return;
          }

          if (accessToken && refreshToken) {
            await onTokens(accessToken, refreshToken);

            // Close the system browser
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch {
              // Browser close is best-effort
            }
          }
        }
      } catch (e) {
        console.error('[NativeOAuth] Error parsing URL:', e);
      }
    });

    console.log('[NativeOAuth] URL listener registered');
    return () => listener.remove();
  } catch (err) {
    console.warn('[NativeOAuth] @capacitor/app not available:', err);
    return null;
  }
}
