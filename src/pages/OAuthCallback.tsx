import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/platform';
import { Loader2 } from 'lucide-react';

// The Capacitor app ID-based URL scheme for deep linking back to the native app
const NATIVE_APP_SCHEME = 'app.lovable.2cd79f530f3e4e88858df49e60e86e08';

/**
 * Dedicated OAuth callback route that handles token handoff.
 * Isolates token parsing from the heavy main app boot to prevent
 * "back to login" race conditions on mobile.
 * 
 * For native Capacitor apps: after processing tokens, redirects back
 * to the native app via custom URL scheme with the session tokens.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('[OAuthCallback] Loaded. Hash present:', !!hash, 'Search present:', !!search);
      console.log('[OAuthCallback] isNativeApp:', isNativeApp());
      console.log('[OAuthCallback] hostname:', window.location.hostname);

      // Parse tokens from hash (format: #access_token=...&refresh_token=...&...)
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
        setTimeout(() => navigateHome(), 3000);
        return;
      }

      // If tokens are present, set the session
      if (accessToken && refreshToken) {
        console.log('[OAuthCallback] Tokens found, calling setSession...');
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[OAuthCallback] setSession error:', sessionError.message);
            setError(sessionError.message);
            setTimeout(() => navigateHome(), 3000);
            return;
          }

          console.log('[OAuthCallback] Session set successfully. User:', data.session?.user?.id);
          
          // If we're running on the Lovable app domain but came from a native app,
          // redirect back to the native app with the tokens
          if (isRunningOnWebForNativeApp()) {
            console.log('[OAuthCallback] Redirecting tokens back to native app...');
            const deepLinkUrl = `${NATIVE_APP_SCHEME}://auth/callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
            window.location.href = deepLinkUrl;
            return;
          }
          
          // Clean URL and redirect to home
          window.history.replaceState({}, '', '/auth/callback');
          navigateHome();
          return;
        } catch (e: any) {
          console.error('[OAuthCallback] Unexpected error:', e);
          setError(e.message || 'Failed to complete sign in');
          setTimeout(() => navigateHome(), 3000);
          return;
        }
      }

      // No tokens and no error - might be a stale navigation.
      console.log('[OAuthCallback] No tokens found, checking existing session...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[OAuthCallback] Existing session found, redirecting home');
      } else {
        console.log('[OAuthCallback] No session, redirecting to login');
      }
      navigateHome();
    };

    const navigateHome = () => {
      navigate('/', { replace: true });
    };

    /**
     * Detect if this callback page is running on the Lovable web domain
     * but was triggered by a native app OAuth flow.
     * This happens when the native app redirects to the broker with
     * redirect_uri pointing to hoopjournal123.lovable.app/auth/callback
     */
    const isRunningOnWebForNativeApp = () => {
      // If we're already in the native app, no need to redirect
      if (isNativeApp()) return false;
      
      // Check if the referrer or URL suggests this came from a native OAuth flow
      // The Lovable app domain handles the callback, and we detect this via
      // the hostname being lovable.app (the native app would have capacitor://localhost)
      const isOnLovableApp = window.location.hostname.includes('lovable.app');
      const hasNativeHint = queryParams.get('from_native') === 'true';
      
      // We detect "for native" when on lovable.app AND the page was likely
      // opened from a native app (check sessionStorage for hint or referrer)
      return isOnLovableApp && hasNativeHint;
    };

    // Make queryParams available for isRunningOnWebForNativeApp
    const queryParams = new URLSearchParams(window.location.search);

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
