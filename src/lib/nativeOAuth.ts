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

// Custom URL scheme registered in the native app's Info.plist
export const NATIVE_URL_SCHEME = 'hoopjournal';

// Dynamic import helper that won't fail at build time
async function dynamicImport(module: string): Promise<Record<string, unknown> | null> {
  try {
    return await new Function('m', 'return import(m)')(module);
  } catch {
    return null;
  }
}

/**
 * Open OAuth in the system browser (not the WebView).
 */
export async function openOAuthInSystemBrowser(brokerUrl: string): Promise<void> {
  if (!isNativeApp()) {
    window.location.href = brokerUrl;
    return;
  }

  const mod = await dynamicImport('@capacitor/browser');
  if (mod?.Browser) {
    console.log('[NativeOAuth] Opening system browser for OAuth...');
    const Browser = mod.Browser as { open: (opts: { url: string; presentationStyle?: string }) => Promise<void> };
    await Browser.open({ url: brokerUrl, presentationStyle: 'popover' });
  } else {
    console.warn('[NativeOAuth] @capacitor/browser not available, falling back to redirect');
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

  const appMod = await dynamicImport('@capacitor/app');
  if (!appMod?.App) {
    console.warn('[NativeOAuth] @capacitor/app not available');
    return null;
  }

  const App = appMod.App as {
    addListener: (event: string, cb: (data: { url: string }) => void) => Promise<{ remove: () => void }>;
  };
  
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
          const browserMod = await dynamicImport('@capacitor/browser');
          if (browserMod?.Browser) {
            const Browser = browserMod.Browser as { close: () => Promise<void> };
            await Browser.close();
          }
        }
      }
    } catch (e) {
      console.error('[NativeOAuth] Error parsing URL:', e);
    }
  });
  
  console.log('[NativeOAuth] URL listener registered');
  return () => listener.remove();
}
