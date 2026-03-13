import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// URL scheme for redirecting back to native Capacitor app
const NATIVE_URL_SCHEME = 'hoopjournal';

/**
 * Dedicated OAuth callback route that handles token handoff.
 * 
 * Two scenarios:
 * 1. Web/PWA: Tokens arrive in hash, set session, redirect to /
 * 2. Native app: This page runs in the system browser (Safari).
 *    After extracting tokens, redirect to hoopjournal://auth/callback 
 *    so the native app can pick them up via appUrlOpen listener.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [redirectingToApp, setRedirectingToApp] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('[OAuthCallback] Loaded. Hash present:', !!hash, 'Search present:', !!search);
      console.log('[OAuthCallback] Full URL:', window.location.href);

      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const queryParams = new URLSearchParams(search);

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const errorParam = hashParams.get('error') || queryParams.get('error');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      // Handle error from OAuth provider
      if (errorParam) {
        console.error('[OAuthCallback] OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }

      if (accessToken && refreshToken) {
        console.log('[OAuthCallback] Tokens found');
        
        // Check if this callback was opened in a system browser by a native app
        // If on the lovable.app domain and user-agent suggests mobile, redirect to app
        const isMobileUA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isOnLovableApp = window.location.hostname.includes('lovable.app');
        
        if (isMobileUA && isOnLovableApp) {
          // Redirect tokens to the native app via custom URL scheme
          console.log('[OAuthCallback] Mobile browser on lovable.app - redirecting to native app');
          setRedirectingToApp(true);
          
          const deepLink = `${NATIVE_URL_SCHEME}://auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
          window.location.href = deepLink;
          
          // Fallback: if deep link doesn't work, show a manual button
          setTimeout(async () => {
            console.log('[OAuthCallback] Deep link may have failed - showing manual return button');
            // Pre-set the session on web so the button works
            try {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              console.log('[OAuthCallback] Session set on web as fallback');
            } catch (e: unknown) {
              console.error('[OAuthCallback] Fallback session error:', e);
            }
            setRedirectingToApp(false);
            setShowReturnButton(true);
            setDeepLinkUrl(deepLink);
          }, 2500);
          return;
        }
        
        // Standard web flow: set session and redirect
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[OAuthCallback] setSession error:', sessionError.message);
            setError(sessionError.message);
            setTimeout(() => navigate('/', { replace: true }), 3000);
            return;
          }

          console.log('[OAuthCallback] Session set successfully. User:', data.session?.user?.id);
          window.history.replaceState({}, '', '/auth/callback');
          navigate('/', { replace: true });
          return;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to complete sign in';
          console.error('[OAuthCallback] Unexpected error:', e);
          setError(msg);
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }
      }

      // No tokens and no error
      console.log('[OAuthCallback] No tokens found, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[OAuthCallback] Existing session found, redirecting home');
      } else {
        console.log('[OAuthCallback] No session, redirecting to login');
      }
      navigate('/', { replace: true });
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
        ) : redirectingToApp ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Opening Hoop Journal...</p>
            <p className="text-muted-foreground text-xs">If the app doesn't open, please go back and try again.</p>
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
