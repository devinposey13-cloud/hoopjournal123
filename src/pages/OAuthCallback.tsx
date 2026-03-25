import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { isNativeApp, getPlatform, isDespiaIOS } from '@/lib/platform';
import { buildNativeOAuthReturnUrl, isMobileSystemBrowserOAuthReturn } from '@/lib/oauthCallback';

/**
 * PRE-CAPTURE: Grab tokens from the URL immediately at module load time,
 * BEFORE the Supabase client's detectSessionInUrl can consume/clear the hash.
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
 * Safely navigate away from the callback page.
 *
 * Uses setTimeout(0) to escape the current React render/microtask cycle
 * before calling window.location.replace. This prevents iOS WKWebView from
 * stalling when a navigation is triggered mid-render.
 */
function safeHardRedirect(url: string): void {
  console.log(`[OAuthCallback] safeHardRedirect → ${url}`);
  // Break out of React's synchronous render cycle
  setTimeout(() => {
    try {
      window.location.replace(url);
    } catch {
      // Fallback if replace throws (rare but possible in WKWebView)
      window.location.href = url;
    }
  }, 0);
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [redirectingToApp, setRedirectingToApp] = useState(false);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const [phase, setPhase] = useState<'init' | 'exchanging' | 'navigating' | 'done' | 'error'>('init');
  const hasRun = useRef(false);
  const navigationTriggered = useRef(false);

  const log = (msg: string) => {
    console.log(`[OAuthCallback] ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`]);
  };

  const logError = (msg: string) => {
    console.error(`[OAuthCallback] ${msg}`);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 23)} ❌ ${msg}`]);
  };

  /** After session is confirmed, navigate to the app */
  const handleSessionEstablished = (accessToken: string, refreshToken: string, userId?: string, provider?: string) => {
    // Guard against double-navigation
    if (navigationTriggered.current) {
      log('Navigation already triggered — skipping duplicate');
      return;
    }
    navigationTriggered.current = true;
    setPhase('navigating');

    log(`Session established${userId ? ` — user: ${userId}` : ''}${provider ? `, provider: ${provider}` : ''}`);

    const native = isNativeApp();
    const isSystemBrowserReturn = isMobileSystemBrowserOAuthReturn({
      hostname: window.location.hostname,
      native,
      userAgent: navigator.userAgent,
    });

    // System browser on mobile + custom domain — deep-link back to native app
    if (isSystemBrowserReturn) {
      log('System browser on custom domain — deep-linking to native app');
      handoffToNativeApp({ accessToken, refreshToken });
      return;
    }

    // Inside Despia shell — use hard redirect to force webview repaint
    if (native) {
      log('Inside Despia shell — hard redirect to /');
      safeHardRedirect('/?postAuth=1&ts=' + Date.now());
      return;
    }

    // Standard web — go home immediately
    log('Web flow — navigating to /');
    navigate('/', { replace: true });
  };

  const handleCallback = async (isRetry = false) => {
    const platform = getPlatform();
    const native = isNativeApp();

    log(`--- ${isRetry ? 'RETRY' : 'START'} ---`);
    log(`Platform: ${platform}, isNative: ${native}, isDespiaIOS: ${isDespiaIOS()}`);
    log(`Pre-captured URL: ${_capturedUrl}`);

    // Use pre-captured tokens
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

    log(`Code: ${!!code}, access_token: ${!!accessToken}, refresh_token: ${!!refreshToken}, error: ${!!errorParam}`);
    log(`System browser return: ${isSystemBrowserReturn}`);

    if (isSystemBrowserReturn && (errorParam || code || (accessToken && refreshToken))) {
      log('System browser callback — handing off to native app');
      handoffToNativeApp({ code, accessToken, refreshToken, error: errorParam, errorDescription });
      return;
    }

    // ── Error from provider ──
    if (errorParam) {
      logError(`OAuth error: ${errorParam} — ${errorDescription}`);
      setPhase('error');
      setError(errorDescription || errorParam);
      setTimeout(() => navigate('/', { replace: true }), 4000);
      return;
    }

    // ── PKCE code exchange ──
    if (code) {
      setPhase('exchanging');
      log('Attempting exchangeCodeForSession...');
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          logError(`exchangeCodeForSession failed: ${exchangeError.message}`);
          log('Falling back to session detection...');
          const fallbackSession = await tryGetExistingSession();
          if (fallbackSession) {
            log('Fallback: session found via getSession');
            handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token, fallbackSession.user?.id, fallbackSession.user?.app_metadata?.provider);
            return;
          }
          setPhase('error');
          setError(`Code exchange failed: ${exchangeError.message}`);
          setShowRetry(true);
          return;
        }

        if (data.session) {
          log(`exchangeCodeForSession succeeded — user: ${data.session.user.id}, provider: ${data.session.user.app_metadata?.provider || 'unknown'}`);
          handleSessionEstablished(data.session.access_token, data.session.refresh_token, data.session.user.id, data.session.user.app_metadata?.provider);
          return;
        }

        logError('exchangeCodeForSession returned no session and no error');
        setPhase('error');
        setError('Authentication completed but no session was returned.');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`exchangeCodeForSession exception: ${msg}`);
        const fallbackSession = await tryGetExistingSession();
        if (fallbackSession) {
          log('Exception fallback: session found');
          handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token, fallbackSession.user?.id, fallbackSession.user?.app_metadata?.provider);
          return;
        }
        setPhase('error');
        setError(`Code exchange error: ${msg}`);
        setShowRetry(true);
        return;
      }
    }

    // ── Tokens in URL (implicit grant — Apple iOS uses this path) ──
    if (accessToken && refreshToken) {
      setPhase('exchanging');
      log('Tokens found — calling setSession...');
      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          logError(`setSession failed: ${sessionError.message}`);
          setPhase('error');
          setError(`Session restore failed: ${sessionError.message}`);
          setShowRetry(true);
          return;
        }

        if (data?.session) {
          log(`setSession succeeded — user: ${data.session.user.id}, provider: ${data.session.user.app_metadata?.provider || 'unknown'}`);
          handleSessionEstablished(data.session.access_token, data.session.refresh_token, data.session.user.id, data.session.user.app_metadata?.provider);
          return;
        }

        logError('setSession returned no error but also no session');
        setPhase('error');
        setError('Session could not be created. Please try again.');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`setSession exception: ${msg}`);
        setPhase('error');
        setError(`Session error: ${msg}`);
        setShowRetry(true);
        return;
      }
    }

    // ── Incomplete tokens ──
    if (accessToken || refreshToken) {
      logError(`Incomplete tokens — access_token: ${!!accessToken}, refresh_token: ${!!refreshToken}`);
      setPhase('error');
      setError('Incomplete authentication tokens received. Please try signing in again.');
      setShowRetry(true);
      return;
    }

    // ── No code or tokens — wait for detectSessionInUrl ──
    setPhase('exchanging');
    log('No code or tokens in URL — waiting for auto-detection...');
    const detected = await waitForSession(8000);
    if (detected) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        log(`Auto-detected session — user: ${session.user.id}`);
        handleSessionEstablished(session.access_token, session.refresh_token, session.user.id, session.user.app_metadata?.provider);
        return;
      }
    }

    logError('No session established after waiting');
    setPhase('error');
    setError('Session could not be restored. Please try signing in again.');
    setShowRetry(true);
  };

  const handoffToNativeApp = ({
    code, accessToken, refreshToken, error, errorDescription,
  }: {
    code?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    error?: string | null;
    errorDescription?: string | null;
  }) => {
    const deepLink = buildNativeOAuthReturnUrl({ code, accessToken, refreshToken, error, errorDescription });
    setRedirectingToApp(true);
    setDeepLinkUrl(deepLink);
    window.location.href = deepLink;
    setTimeout(() => {
      setRedirectingToApp(false);
      setShowReturnButton(true);
    }, 3000);
  };

  const tryGetExistingSession = async () => {
    await new Promise(r => setTimeout(r, 100));
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

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
    navigationTriggered.current = false;
    setPhase('init');
    handleCallback(true);
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Wrap the entire flow in a top-level try/catch so an unhandled
    // exception never leaves the user on a blank white screen.
    handleCallback().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      logError(`Unhandled callback error: ${msg}`);
      setPhase('error');
      setError(`Unexpected error: ${msg}`);
      setShowRetry(true);
    });

    // ── Aggressive watchdog for iOS native ──
    // If we're still on /auth/callback after 4s AND a session exists,
    // force-navigate to home. This catches every edge case where the
    // main flow completed setSession but navigation stalled.
    if (isNativeApp() && isDespiaIOS()) {
      const watchdogInterval = setInterval(async () => {
        if (navigationTriggered.current) {
          // Navigation was already triggered — give it a moment then force
          // This handles the case where window.location.replace silently failed
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('[OAuthCallback] Watchdog — session exists, navigation was triggered but page still here. Forcing redirect.');
              window.location.href = '/?postAuth=1&watchdog=1&ts=' + Date.now();
            }
          } catch { /* ignore */ }
          clearInterval(watchdogInterval);
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('[OAuthCallback] Watchdog — session found, forcing redirect');
            navigationTriggered.current = true;
            window.location.href = '/?postAuth=1&watchdog=1&ts=' + Date.now();
            clearInterval(watchdogInterval);
          }
        } catch { /* ignore */ }
      }, 2000);

      // Clean up after 15s regardless
      const watchdogCleanup = setTimeout(() => clearInterval(watchdogInterval), 15000);

      return () => {
        clearInterval(watchdogInterval);
        clearTimeout(watchdogCleanup);
      };
    }
  }, []);

  // ── Render ──

  // Error / native handoff states
  if (error || showReturnButton || redirectingToApp) {
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
          ) : (
            <p className="text-muted-foreground">Opening Hoop Journal...</p>
          )}
        </div>
      </div>
    );
  }

  // Default: visible loading state so there's NEVER a blank white screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">
          {phase === 'navigating' ? 'Opening app…' : 'Signing you in…'}
        </p>
      </div>
    </div>
  );
}
