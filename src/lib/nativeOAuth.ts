/**
 * Native OAuth helper for Capacitor apps.
 * 
 * Uses the system browser (SFSafariViewController on iOS) for OAuth
 * so the WebView stays on the local bundle. After OAuth completes,
 * the callback page redirects to a custom URL scheme that the app intercepts.
 * 
 * SETUP REQUIRED in the native Xcode/Android Studio project:
 * 1. Install @capacitor/browser: npm install @capacitor/browser
 * 2. Install @capacitor/app: npm install @capacitor/app  
 * 3. Add URL scheme in Xcode: Info → URL Types → add scheme "hoopjournal"
 * 4. Run npx cap sync
 */

import { isNativeApp } from '@/lib/platform';

// Custom URL scheme registered in the native app's Info.plist
export const NATIVE_URL_SCHEME = 'hoopjournal';

/**
 * Open OAuth in the system browser (not the WebView).
 */
export async function openOAuthInSystemBrowser(brokerUrl: string): Promise<void> {
  if (!isNativeApp()) {
    window.location.href = brokerUrl;
    return;
  }

  try {
    // Dynamic import to avoid build errors when Capacitor plugins aren't installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const browserModule = await (import as any)('@capacitor/browser');
    const Browser = browserModule.Browser;
    
    console.log('[NativeOAuth] Opening system browser for OAuth...');
    await Browser.open({ url: brokerUrl, presentationStyle: 'popover' });
  } catch (e) {
    console.warn('[NativeOAuth] @capacitor/browser not available, falling back to redirect', e);
    window.location.href = brokerUrl;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appModule = await (import as any)('@capacitor/app');
    const App = appModule.App;
    
    const listener = await App.addListener('appUrlOpen', async (event: { url: string }) => {
      console.log('[NativeOAuth] App opened with URL:', event.url);
      
      try {
        const url = new URL(event.url);
        
        if (url.pathname.includes('auth/callback') || url.host.includes('auth')) {
          const hashParams = new URLSearchParams(url.hash.replace('#', ''));
          const searchParams = new URLSearchParams(url.search);
          
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
          const error = hashParams.get('error') || searchParams.get('error');
          const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
          
          if (error) {
            onError(errorDesc || error);
            return;
          }
          
          if (accessToken && refreshToken) {
            await onTokens(accessToken, refreshToken);
            
            // Close the system browser
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const browserMod = await (import as any)('@capacitor/browser');
              await browserMod.Browser.close();
            } catch (_) {}
          }
        }
      } catch (e) {
        console.error('[NativeOAuth] Error parsing URL:', e);
      }
    });
    
    console.log('[NativeOAuth] URL listener registered');
    return () => listener.remove();
  } catch (e) {
    console.warn('[NativeOAuth] @capacitor/app not available:', e);
    return null;
  }
}
