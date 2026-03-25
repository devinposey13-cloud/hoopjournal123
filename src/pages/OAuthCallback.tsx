import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { isNativeApp, getPlatform } from '@/lib/platform';
import { buildNativeOAuthReturnUrl, isMobileSystemBrowserOAuthReturn } from '@/lib/oauthCallback';

/**
 * PRE-CAPTURE: Grab tokens from the URL immediately at module load time,
 * BEFORE the Supabase client's detectSessionInUrl can consume/clear the hash.
 * This prevents the "Auth session missing" error in implicit grant flows.
 */
const _capturedUrl = window.location.href;
const _capturedHash = window.location.hash;
const _capturedSearch = window.location.search;
const _hashParams = new URLSearchParams(_capturedHash.replace('#', ''));
const _queryParams = new URLSearchParams(_capturedSearch);
const _preCapturedTokens = {
  accessToken: _hashParams.get('access_token') || _queryParams.get('access_token'),
  refreshToken: _hashParams.get('refresh_token') || _queryParams.get('refresh_token'),
  code: _queryParams.get('code'),
  error: _hashParams.get('error') || _queryParams.get('error'),
  errorDescription: _hashParams.get('error_description') || _queryParams.get('error_description'),
};

console.log('[OAuthCallback:module] Pre-captured tokens —', {
  accessToken: !!_preCapturedTokens.accessToken,
  refreshToken: !!_preCapturedTokens.refreshToken,
  code: !!_preCapturedTokens.code,
  error: !!_preCapturedTokens.error,
  url: _capturedUrl,
});

/**
 * OAuth callback handler — supports both web and Despia native.
 *
 * Key flow:
 * 1. Parse URL for code, tokens, or errors (pre-captured at module load)
 * 2. If code present → explicitly call exchangeCodeForSession(code)
 * 3. If tokens present → call setSession (implicit grant)
 * 4. Verify session exists before redirecting
 * 5. For Despia system browser → deep-link tokens back to native app
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [redirectingToApp, setRedirectingToApp] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const hasRun = useRef(false);

  const log = (msg: string) => {
    console.log(`[OAuthCallback] ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`]);
  };

  const logError = (msg: string) => {
    console.error(`[OAuthCallback] ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 23)} ❌ ${msg}`]);
  };

  const handleCallback = async (isRetry = false) => {
    const platform = getPlatform();
    const native = isNativeApp();

    log(`--- ${isRetry ? 'RETRY' : 'START'} ---`);
    log(`Platform: ${platform}, isNative: ${native}`);
    log(`Pre-captured URL: ${_capturedUrl}`);

    // Apple Auth Audit: log callback receipt if this is an Apple flow
    try {
      const { logAppleAuthEvent, updateAppleAuthMetadata, getCurrentAttempt, completeAppleAuthSuccess, completeAppleAuthFailure } = await import('@/lib/appleAuthAudit');
      const currentAttempt = getCurrentAttempt();
      if (currentAttempt) {
        const hasCode = !!(_preCapturedTokens.code || new URLSearchParams(window.location.search).get('code'));
        const hasTokens = !!_preCapturedTokens.accessToken;
        const hasError = !!_preCapturedTokens.error;

        logAppleAuthEvent('callback_received', {
          url: _capturedUrl.slice(0, 120),
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          platform,
          isNative: native,
          authCodePresent: hasCode,
          tokensPresent: hasTokens,
          errorPresent: hasError,
          flowType: currentAttempt.metadata?.flowType || 'unknown',
        });
        updateAppleAuthMetadata({ callbackUriReturned: _capturedUrl.slice(0, 200) });
      }
    } catch { /* audit trail not critical */ }

    // Use pre-captured tokens (grabbed at module load before Supabase could clear them)
    // On retry, also re-check current URL in case hash is still present
    const currentHash = new URLSearchParams(window.location.hash.replace('#', ''));
    const currentQuery = new URLSearchParams(window.location.search);

    const accessToken = _preCapturedTokens.accessToken
      || currentHash.get('access_token') || currentQuery.get('access_token');
    const refreshToken = _preCapturedTokens.refreshToken
      || currentHash.get('refresh_token') || currentQuery.get('refresh_token');
    const code = _preCapturedTokens.code || currentQuery.get('code');
    const errorParam = _preCapturedTokens.error
      || currentHash.get('error') || currentQuery.get('error');
    const errorDescription = _preCapturedTokens.errorDescription
      || currentHash.get('error_description') || currentQuery.get('error_description');

    const isSystemBrowserReturn = isMobileSystemBrowserOAuthReturn({
      hostname: window.location.hostname,
      native,
      userAgent: navigator.userAgent,
    });

    log(`Code present: ${!!code}`);
    log(`access_token exists: ${!!accessToken}`);
    log(`refresh_token exists: ${!!refreshToken}`);
    log(`Error present: ${!!errorParam}`);
    log(`System browser return: ${isSystemBrowserReturn}`);

    if (isSystemBrowserReturn && (errorParam || code || (accessToken && refreshToken))) {
      log('System browser callback detected — handing off auth payload to native app');
      handoffToNativeApp({
        code,
        accessToken,
        refreshToken,
        error: errorParam,
        errorDescription,
      });
      return;
    }

    // ── Error from provider ──
    if (errorParam) {
      logError(`OAuth provider error: ${errorParam} — ${errorDescription}`);
      setError(errorDescription || errorParam);
      setTimeout(() => navigate('/', { replace: true }), 4000);
      return;
    }

    // ── PKCE code exchange (primary path for both web and Despia) ──
    if (code) {
      log('Attempting exchangeCodeForSession...');
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          logError(`exchangeCodeForSession failed: ${exchangeError.message}`);

          // If exchange fails, the code_verifier may be missing (system browser context).
          // Fall back to waiting for detectSessionInUrl which may have already fired.
          log('Falling back to session detection...');
          const fallbackSession = await tryGetExistingSession();
          if (fallbackSession) {
            log('Fallback: session found via getSession');
            await handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token);
            return;
          }

          setError(`Code exchange failed: ${exchangeError.message}`);
          setShowRetry(true);
          return;
        }

        if (data.session) {
          log(`exchangeCodeForSession succeeded — user: ${data.session.user.id}`);
          log(`Provider: ${data.session.user.app_metadata?.provider || 'unknown'}`);
          await handleSessionEstablished(data.session.access_token, data.session.refresh_token);
          return;
        }

        logError('exchangeCodeForSession returned no session and no error');
        setError('Authentication completed but no session was returned.');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`exchangeCodeForSession exception: ${msg}`);

        // Fall back to checking if detectSessionInUrl already handled it
        log('Exception fallback: checking existing session...');
        const fallbackSession = await tryGetExistingSession();
        if (fallbackSession) {
          log('Exception fallback: session found');
          await handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token);
          return;
        }

        setError(`Code exchange error: ${msg}`);
        setShowRetry(true);
        return;
      }
    }

    // ── Tokens in URL (implicit grant) ──
    if (accessToken && refreshToken) {
      log('Both access_token and refresh_token found — implicit grant flow');

      // First check if detectSessionInUrl already established a session
      const existingSession = await tryGetExistingSession();
      if (existingSession) {
        log('detectSessionInUrl already restored session — skipping manual setSession');
        log(`Session user: ${existingSession.user?.id}, provider: ${existingSession.user?.app_metadata?.provider}`);
        await handleSessionEstablished(existingSession.access_token, existingSession.refresh_token);
        return;
      }

      log('No existing session found — calling supabase.auth.setSession...');
      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          logError(`setSession failed: ${sessionError.message}`);
          setError(`Session restore failed: ${sessionError.message}`);
          setShowRetry(true);
          return;
        }

        if (data?.session) {
          log(`setSession succeeded — user: ${data.session.user.id}`);
          log(`Provider: ${data.session.user.app_metadata?.provider || 'unknown'}`);
          await handleSessionEstablished(data.session.access_token, data.session.refresh_token);
          return;
        }

        logError('setSession returned no error but also no session');
        setError('Session could not be created. Please try again.');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`setSession exception: ${msg}`);
        setError(`Session error: ${msg}`);
        setShowRetry(true);
        return;
      }
    }

    // ── Only access_token without refresh_token (or vice versa) ──
    if (accessToken || refreshToken) {
      logError(`Incomplete tokens — access_token: ${!!accessToken}, refresh_token: ${!!refreshToken}`);
      setError('Incomplete authentication tokens received. Please try signing in again.');
      setShowRetry(true);
      return;
    }

    // ── No code or tokens — wait for detectSessionInUrl ──
    log('No code or tokens in URL — waiting for auto-detection...');
    const detected = await waitForSession(8000);
    if (detected) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        log(`Auto-detected session — user: ${session.user.id}`);
        await handleSessionEstablished(session.access_token, session.refresh_token);
        return;
      }
    }

    logError('No session established after waiting');
    setError('Session could not be restored. Please try signing in again.');
    setShowRetry(true);
  };

  const handoffToNativeApp = ({
    code,
    accessToken,
    refreshToken,
    error,
    errorDescription,
  }: {
    code?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  }) => {
    const deepLink = buildNativeOAuthReturnUrl({
      code,
      accessToken,
      refreshToken,
      error,
      errorDescription,
    });

    setRedirectingToApp(true);
    setDeepLinkUrl(deepLink);
    window.location.href = deepLink;

    setTimeout(() => {
      setRedirectingToApp(false);
      setShowReturnButton(true);
    }, 3000);
  };

  /** After session is confirmed, decide where to go */
  const handleSessionEstablished = async (accessToken: string, refreshToken: string) => {
    // Verify session is actually retrievable
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logError('Session verification failed — getSession returned null after exchange');
      setError('Session was created but could not be verified. Please try again.');
      setShowRetry(true);
      return;
    }

    log(`Session verified — user: ${session.user.id}, provider: ${session.user.app_metadata?.provider}`);

    // Apple Auth Audit: complete success if this was an Apple flow
    try {
      const { getCurrentAttempt, completeAppleAuthSuccess, logAppleAuthEvent } = await import('@/lib/appleAuthAudit');
      const currentAttempt = getCurrentAttempt();
      if (currentAttempt && session.user.app_metadata?.provider === 'apple') {
        logAppleAuthEvent('navigation_complete', { userId: session.user.id.slice(0, 8), provider: 'apple' });
        completeAppleAuthSuccess();
      }
    } catch { /* non-critical */ }

    const native = isNativeApp();
    const isSystemBrowserReturn = isMobileSystemBrowserOAuthReturn({
      hostname: window.location.hostname,
      native,
      userAgent: navigator.userAgent,
    });

    // Inside Despia shell — just navigate home
    if (native) {
      log('Inside Despia shell — navigating to /');
      navigate('/', { replace: true });
      return;
    }

    // System browser on mobile + custom domain — deep-link back to native app
    if (isSystemBrowserReturn) {
      log('System browser on custom domain — deep-linking to native app');
      handoffToNativeApp({ accessToken, refreshToken });
      return;
    }

    // Standard web — go home
    log('Web flow — navigating to /');
    window.history.replaceState({}, '', '/auth/callback');
    navigate('/', { replace: true });
  };

  /** Try to get an existing session (in case detectSessionInUrl already ran) */
  const tryGetExistingSession = async () => {
    // Small delay to let any in-flight detectSessionInUrl complete
    await new Promise(r => setTimeout(r, 500));
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  /** Wait for onAuthStateChange to fire SIGNED_IN */
  const waitForSession = (timeoutMs = 8000): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;

      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        log(`Auth state change: ${event}`);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (!resolved) {
            resolved = true;
            sub.subscription.unsubscribe();
            resolve(true);
          }
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          sub.subscription.unsubscribe();
          log(`waitForSession timed out after ${timeoutMs}ms`);
          resolve(false);
        }
      }, timeoutMs);
    });
  };

  const handleRetry = () => {
    setError(null);
    setShowRetry(false);
    setDebugInfo([]);
    handleCallback(true);
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-4">
        {error ? (
          <>
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
            <p className="text-destructive font-medium">Sign in failed</p>
            <p className="text-muted-foreground text-sm">{error}</p>
            {showRetry && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors mt-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
            <button
              onClick={() => navigate('/', { replace: true })}
              className="block mx-auto text-xs text-muted-foreground underline mt-2"
            >
              Return to sign in
            </button>
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

        {/* Debug info — visible temporarily for troubleshooting */}
        {debugInfo.length > 0 && (
          <div className="mt-6 text-left bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-mono text-muted-foreground mb-1 font-semibold">Debug Log:</p>
            {debugInfo.map((line, i) => (
              <p key={i} className="text-[9px] font-mono text-muted-foreground leading-tight">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
