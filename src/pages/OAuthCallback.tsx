import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Dedicated OAuth callback route that handles token handoff.
 * Isolates token parsing from the heavy main app boot to prevent
 * "back to login" race conditions on mobile.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('[OAuthCallback] Loaded. Hash present:', !!hash, 'Search present:', !!search);

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
        setTimeout(() => navigate('/', { replace: true }), 3000);
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
            setTimeout(() => navigate('/', { replace: true }), 3000);
            return;
          }

          console.log('[OAuthCallback] Session set successfully. User:', data.session?.user?.id);
          
          // Clean URL and redirect to home
          window.history.replaceState({}, '', '/auth/callback');
          navigate('/', { replace: true });
          return;
        } catch (e: any) {
          console.error('[OAuthCallback] Unexpected error:', e);
          setError(e.message || 'Failed to complete sign in');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }
      }

      // No tokens and no error - might be a stale navigation.
      // Let Supabase's detectSessionInUrl handle it if tokens are in the hash
      // but weren't parsed above. Wait briefly then redirect.
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
