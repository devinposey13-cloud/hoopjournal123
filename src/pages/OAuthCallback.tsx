import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { isNativeApp, getPlatform } from '@/lib/platform';

const NATIVE_URL_SCHEME = 'hoopjournal';

/**
 * OAuth callback handler — supports both web and Despia native.
 *
 * WEB: Supabase PKCE auto-exchanges the code via detectSessionInUrl,
 *      then we redirect to /.
 *
 * DESPIA NATIVE (system browser on hoopjournal.me):
 *   1. PKCE code exchange happens automatically (same domain as redirectTo).
 *   2. If we're in the system browser (mobile UA, not inside Despia),
 *      deep-link tokens back to the native app via Universal Links / custom scheme.
 *   3. If we're already inside Despia (Universal Link returned us), just navigate to /.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [redirectingToApp, setRedirectingToApp] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const platform = getPlatform();
      const native = isNativeApp();

      console.log(`[OAuthCallback] Processing callback — platform: ${platform}, isNative: ${native}`);
      console.log(`[OAuthCallback] URL: ${window.location.href}`);

      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const queryParams = new URLSearchParams(search);

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const code = queryParams.get('code');
      const errorParam = hashParams.get('error') || queryParams.get('error');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      // ── Error from provider ──
      if (errorParam) {
        console.error('[OAuthCallback] OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }

      // ── Inside Despia native shell: session was set, just go home ──
      if (native) {
        console.log('[OAuthCallback] Inside Despia shell — waiting for session...');
        await waitForSession();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[OAuthCallback] Session active in Despia, navigating home');
          navigate('/', { replace: true });
        } else {
          console.warn('[OAuthCallback] No session found in Despia shell');
          setError('Session could not be restored. Please try signing in again.');
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
        return;
      }

      // ── Tokens in URL (implicit grant or native redirect) ──
      if (accessToken && refreshToken) {
        console.log('[OAuthCallback] Tokens found in URL');

        // Check if system browser opened by Despia native app
        const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isOnPublishedDomain = window.location.hostname.includes('lovable.app') ||
                                     window.location.hostname.includes('hoopjournal.me');

        if (isMobileUA && isOnPublishedDomain) {
          console.log('[OAuthCallback] Mobile system browser — deep-linking tokens to native app');
          setRedirectingToApp(true);

          // Set session in case Universal Link brings us back to the same page
          try {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            console.log('[OAuthCallback] Session set in system browser');
          } catch (e) {
            console.error('[OAuthCallback] setSession error in system browser:', e);
          }

          // Deep-link to native app with tokens
          const deepLink = `${NATIVE_URL_SCHEME}://oauth/auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
          setDeepLinkUrl(deepLink);
          window.location.href = deepLink;

          // Fallback if deep link fails
          setTimeout(() => {
            setRedirectingToApp(false);
            setShowReturnButton(true);
          }, 3000);
          return;
        }

        // Standard web: set session and go home
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[OAuthCallback] setSession error:', sessionError.message);
            setError(sessionError.message);
            setTimeout(() => navigate('/', { replace: true }), 3000);
            return;
          }

          console.log('[OAuthCallback] Session set successfully (web)');
          window.history.replaceState({}, '', '/auth/callback');
          navigate('/', { replace: true });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to complete sign in';
          setError(msg);
          setTimeout(() => navigate('/', { replace: true }), 3000);
        }
        return;
      }

      // ── PKCE flow: code in URL or Supabase client auto-exchanges ──
      if (code) {
        console.log('[OAuthCallback] PKCE code found, waiting for Supabase to exchange...');
      } else {
        console.log('[OAuthCallback] No tokens or code — waiting for PKCE exchange...');
      }

      await waitForSession();

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log(`[OAuthCallback] Session established via PKCE — provider: ${session.user?.app_metadata?.provider}`);

        // If in system browser on mobile, deep-link back to app
        const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isOnCustomDomain = window.location.hostname.includes('hoopjournal.me');

        if (isMobileUA && isOnCustomDomain) {
          console.log('[OAuthCallback] PKCE complete in system browser — deep-linking to app');
          setRedirectingToApp(true);

          const deepLink = `${NATIVE_URL_SCHEME}://oauth/auth/callback?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
          setDeepLinkUrl(deepLink);
          window.location.href = deepLink;

          setTimeout(() => {
            setRedirectingToApp(false);
            setShowReturnButton(true);
          }, 3000);
          return;
        }

        navigate('/', { replace: true });
      } else {
        console.warn('[OAuthCallback] No session after PKCE wait');
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">Sign in failed</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            <p className="text-muted-foreground text-xs">Redirecting...</p>
          </>
        ) : showReturnButton ? (
          <>
            <p className="text-foreground font-medium">Sign in complete!</p>
            <p className="text-muted-foreground text-sm mb-4">Tap the button below to return to Hoop Journal.</p>
            <a
              href={deepLinkUrl || 'hoopjournal://'}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Return to App
            </a>
            <p className="text-muted-foreground text-xs mt-3">
              If the button doesn't work, open Hoop Journal manually — you're already signed in.
            </p>
          </>
        ) : redirectingToApp ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Opening Hoop Journal...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Wait up to 5s for Supabase to hydrate the session (PKCE exchange). */
async function waitForSession(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!resolved) {
          resolved = true;
          sub.subscription.unsubscribe();
          resolve();
        }
      }
    });

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        sub.subscription.unsubscribe();
        resolve();
      }
    }, 5000);
  });
}
