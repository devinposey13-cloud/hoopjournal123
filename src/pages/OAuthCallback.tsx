import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { isNativeApp, getPlatform, isDespiaIOS } from '@/lib/platform';
import { buildNativeOAuthReturnUrl, isMobileSystemBrowserOAuthReturn } from '@/lib/oauthCallback';
import {
  resumeOrCreateCallbackAttempt,
  logEvent,
  logTokenPresence,
  updateMetadata,
  completeAttempt,
  isDebugEnabled,
} from '@/lib/appleAuthDebugTracker';

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
 */
function safeHardRedirect(url: string): void {
  console.log(`[OAuthCallback] safeHardRedirect → ${url}`);
  try {
    window.location.replace(url);
  } catch {
    window.location.href = url;
  }
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
    if (navigationTriggered.current) {
      log('Navigation already triggered — skipping duplicate');
      return;
    }
    navigationTriggered.current = true;
    setPhase('navigating');

    log(`Session established${userId ? ` — user: ${userId}` : ''}${provider ? `, provider: ${provider}` : ''}`);

    // TEMPORARY: Debug tracking
    logEvent('session_established', { userId, provider });
    updateMetadata('sessionEstablished', true);
    updateMetadata('sessionUserId', userId || 'unknown');

    const native = isNativeApp();
    const isSystemBrowserReturn = isMobileSystemBrowserOAuthReturn({
      hostname: window.location.hostname,
      native,
      userAgent: navigator.userAgent,
    });

    if (isSystemBrowserReturn) {
      log('System browser on custom domain — deep-linking to native app');
      logEvent('navigation_started', { method: 'system_browser_deeplink' });
      handoffToNativeApp({ accessToken, refreshToken });
      return;
    }

    if (native) {
      log('Inside Despia shell — hard redirect to /');
      logEvent('navigation_started', { method: 'despia_hard_redirect' });
      safeHardRedirect('/?postAuth=1&ts=' + Date.now());

      // TEMPORARY: Track whether redirect actually worked
      setTimeout(() => {
        logEvent('navigation_stall_check', {
          stillOnCallback: window.location.pathname === '/auth/callback',
        });
        if (window.location.pathname === '/auth/callback') {
          logEvent('navigation_fallback_forced', { method: 'window.location.href' });
          window.location.href = '/?postAuth=1&fallback=1&ts=' + Date.now();
        }
      }, 3000);
      return;
    }

    log('Web flow — navigating to /');
    logEvent('navigation_started', { method: 'react_navigate' });
    navigate('/', { replace: true });
    logEvent('navigation_completed', { method: 'react_navigate' });
    completeAttempt('success');
  };

  const handleCallback = async (isRetry = false) => {
    const platform = getPlatform();
    const native = isNativeApp();

    log(`--- ${isRetry ? 'RETRY' : 'START'} ---`);
    log(`Platform: ${platform}, isNative: ${native}, isDespiaIOS: ${isDespiaIOS()}`);
    log(`Pre-captured URL: ${_capturedUrl}`);

    // TEMPORARY: Resume or create debug attempt
    resumeOrCreateCallbackAttempt();
    logEvent('redirect_return_detected', { isRetry, platform, native, url: window.location.href });
    logEvent('callback_processing_started', { isRetry, platform, native });
    updateMetadata('callbackUrl', _capturedUrl);

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

    // TEMPORARY: Debug tracking
    logTokenPresence({ accessToken, refreshToken, code, error: errorParam });
    logEvent('query_params_parsed', {
      hasCode: !!code,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasError: !!errorParam,
      isSystemBrowserReturn,
    });

    if (isSystemBrowserReturn && (errorParam || code || (accessToken && refreshToken))) {
      log('System browser callback — handing off to native app');
      logEvent('handoff_to_native', { reason: 'system_browser_return' });
      handoffToNativeApp({ code, accessToken, refreshToken, error: errorParam, errorDescription });
      return;
    }

    // ── Error from provider ──
    if (errorParam) {
      logError(`OAuth error: ${errorParam} — ${errorDescription}`);
      setPhase('error');
      setError(errorDescription || errorParam);
      completeAttempt('error', `${errorParam}: ${errorDescription}`);
      setTimeout(() => navigate('/', { replace: true }), 4000);
      return;
    }

    // ── PKCE code exchange ──
    if (code) {
      setPhase('exchanging');
      logEvent('session_exchange_started', { method: 'exchangeCodeForSession' });
      log('Attempting exchangeCodeForSession...');
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          logError(`exchangeCodeForSession failed: ${exchangeError.message}`);
          logEvent('session_exchange_failed', { error: exchangeError.message });
          log('Falling back to session detection...');
          const fallbackSession = await tryGetExistingSession();
          if (fallbackSession) {
            log('Fallback: session found via getSession');
            logEvent('session_exchange_completed', { method: 'fallback_getSession' });
            handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token, fallbackSession.user?.id, fallbackSession.user?.app_metadata?.provider);
            return;
          }
          setPhase('error');
          setError(`Code exchange failed: ${exchangeError.message}`);
          completeAttempt('error', exchangeError.message);
          setShowRetry(true);
          return;
        }

        if (data.session) {
          logEvent('session_exchange_completed', { method: 'exchangeCodeForSession', userId: data.session.user.id });
          log(`exchangeCodeForSession succeeded — user: ${data.session.user.id}`);
          handleSessionEstablished(data.session.access_token, data.session.refresh_token, data.session.user.id, data.session.user.app_metadata?.provider);
          return;
        }

        logError('exchangeCodeForSession returned no session and no error');
        setPhase('error');
        setError('Authentication completed but no session was returned.');
        completeAttempt('error', 'No session returned');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`exchangeCodeForSession exception: ${msg}`);
        logEvent('session_exchange_exception', { error: msg });
        const fallbackSession = await tryGetExistingSession();
        if (fallbackSession) {
          log('Exception fallback: session found');
          logEvent('session_exchange_completed', { method: 'exception_fallback' });
          handleSessionEstablished(fallbackSession.access_token, fallbackSession.refresh_token, fallbackSession.user?.id, fallbackSession.user?.app_metadata?.provider);
          return;
        }
        setPhase('error');
        setError(`Code exchange error: ${msg}`);
        completeAttempt('error', msg);
        setShowRetry(true);
        return;
      }
    }

    // ── Tokens in URL (implicit grant — Apple iOS uses this path) ──
    if (accessToken && refreshToken) {
      setPhase('exchanging');
      logEvent('session_exchange_started', { method: 'setSession_tokens' });
      log('Tokens found — calling setSession...');
      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          logError(`setSession failed: ${sessionError.message}`);
          logEvent('session_exchange_failed', { error: sessionError.message });
          setPhase('error');
          setError(`Session restore failed: ${sessionError.message}`);
          completeAttempt('error', sessionError.message);
          setShowRetry(true);
          return;
        }

        if (data?.session) {
          logEvent('session_exchange_completed', { method: 'setSession', userId: data.session.user.id });
          log(`setSession succeeded — user: ${data.session.user.id}`);
          handleSessionEstablished(data.session.access_token, data.session.refresh_token, data.session.user.id, data.session.user.app_metadata?.provider);
          return;
        }

        logError('setSession returned no error but also no session');
        setPhase('error');
        setError('Session could not be created. Please try again.');
        completeAttempt('error', 'setSession returned no session');
        setShowRetry(true);
        return;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`setSession exception: ${msg}`);
        logEvent('session_exchange_exception', { error: msg });
        setPhase('error');
        setError(`Session error: ${msg}`);
        completeAttempt('error', msg);
        setShowRetry(true);
        return;
      }
    }

    // ── Incomplete tokens ──
    if (accessToken || refreshToken) {
      logError(`Incomplete tokens — access_token: ${!!accessToken}, refresh_token: ${!!refreshToken}`);
      logEvent('incomplete_tokens');
      setPhase('error');
      setError('Incomplete authentication tokens received. Please try signing in again.');
      completeAttempt('error', 'Incomplete tokens');
      setShowRetry(true);
      return;
    }

    // ── No code or tokens — wait for detectSessionInUrl ──
    setPhase('exchanging');
    logEvent('waiting_for_auto_detection');
    log('No code or tokens in URL — waiting for auto-detection...');

    // iPad gets a longer timeout due to ITP / service worker interference
    const isIPad = /iPad|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;
    const waitTimeout = isIPad ? 12000 : 8000;
    log(`Wait timeout: ${waitTimeout}ms (iPad: ${isIPad})`);

    const detected = await waitForSession(waitTimeout);
    if (detected) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        log(`Auto-detected session — user: ${session.user.id}`);
        logEvent('session_exchange_completed', { method: 'auto_detection', userId: session.user.id });
        handleSessionEstablished(session.access_token, session.refresh_token, session.user.id, session.user.app_metadata?.provider);
        return;
      }
    }

    // ── Auto-retry: one more getSession attempt before giving up ──
    log('Auto-detection timed out — performing one final getSession retry...');
    logEvent('auto_retry_after_timeout');
    await new Promise(r => setTimeout(r, 500));
    const { data: { session: retrySession } } = await supabase.auth.getSession();
    if (retrySession) {
      log(`Retry succeeded — user: ${retrySession.user.id}`);
      logEvent('session_exchange_completed', { method: 'auto_retry', userId: retrySession.user.id });
      handleSessionEstablished(retrySession.access_token, retrySession.refresh_token, retrySession.user.id, retrySession.user.app_metadata?.provider);
      return;
    }

    logError('No session established after waiting + retry');
    logEvent('session_wait_timeout');
    setPhase('error');
    setError('Session could not be restored. Please try signing in again.');
    completeAttempt('timeout', `No session after ${waitTimeout}ms wait + retry`);
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
        logEvent('auth_state_change', { event });
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
          logEvent('wait_for_session_timeout', { timeoutMs });
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

    handleCallback().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      logError(`Unhandled callback error: ${msg}`);
      logEvent('unhandled_error', { error: msg });
      setPhase('error');
      setError(`Unexpected error: ${msg}`);
      completeAttempt('error', msg);
      setShowRetry(true);
    });

    // ── Fast watchdog for iOS native (iPhone + iPad) ──
    // Polls every 400ms for up to 8s, then shows retry UI
    if (isNativeApp() && isDespiaIOS()) {
      const POLL_MS = 400;
      const TIMEOUT_MS = 8000;
      let watchdogTick = 0;
      const watchdogStartedAt = Date.now();

      logEvent('watchdog_started', { source: 'iOS-native', pollMs: POLL_MS, timeoutMs: TIMEOUT_MS });
      console.log(`[OAuthCallback] iOS-native watchdog started (${POLL_MS}ms polling, ${TIMEOUT_MS / 1000}s timeout)`);

      const watchdogInterval = setInterval(async () => {
        watchdogTick++;
        const elapsed = Date.now() - watchdogStartedAt;
        logEvent('session_poll_attempt', { tick: watchdogTick, elapsed });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            clearInterval(watchdogInterval);
            logEvent('session_found', {
              tick: watchdogTick,
              elapsed,
              userId: session.user.id,
              provider: session.user.app_metadata?.provider,
              alreadyNavigated: navigationTriggered.current,
            });
            console.log(`[OAuthCallback] Watchdog: session found at tick ${watchdogTick} (+${elapsed}ms)`);
            navigationTriggered.current = true;
            completeAttempt('success');
            logEvent('navigation_to_next_screen', { method: 'watchdog_redirect', elapsed });
            window.location.href = '/?postAuth=1&watchdog=1&ts=' + Date.now();
            // Verify redirect actually happened
            setTimeout(() => {
              if (window.location.pathname === '/auth/callback') {
                logEvent('watchdog_redirect_stalled', { elapsed: Date.now() - watchdogStartedAt });
                window.location.replace('/?postAuth=1&watchdog=2&ts=' + Date.now());
              }
            }, 2000);
          } else {
            logEvent('session_not_found', { tick: watchdogTick, elapsed });
          }
        } catch (e) {
          logEvent('session_poll_error', { tick: watchdogTick, error: String(e) });
        }
      }, POLL_MS);

      const watchdogTimeout = setTimeout(() => {
        clearInterval(watchdogInterval);
        const elapsed = Date.now() - watchdogStartedAt;
        logEvent('timeout_reached', { source: 'iOS-native', ticks: watchdogTick, elapsed });
        logEvent('watchdog_cleanup_complete', { showingRetryUI: true });
        console.log(`[OAuthCallback] Watchdog timed out after ${elapsed}ms (${watchdogTick} ticks)`);
        setShowRetry(true);
        setPhase('error');
        setError('Sign in is taking longer than expected. Please try again.');
      }, TIMEOUT_MS);

      return () => {
        clearInterval(watchdogInterval);
        clearTimeout(watchdogTimeout);
        logEvent('watchdog_cleanup_complete', { reason: 'component_unmount' });
      };
    }
  }, []);

  // ── Debug mode: show inline diagnostics ──
  const showDebug = isDebugEnabled();

  // ── Render ──
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

          {/* TEMPORARY: Debug log for error/handoff states */}
          {showDebug && debugInfo.length > 0 && (
            <div className="mt-4 text-left bg-muted/50 rounded p-2 max-h-40 overflow-y-auto">
              <p className="text-[10px] font-mono text-muted-foreground">
                {debugInfo.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: always show visible loading/recovery state — never blank white
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        {showRetry ? (
          <>
            <AlertTriangle className="w-8 h-8 mx-auto text-yellow-500" />
            <p className="text-foreground font-medium text-sm">Sign in is taking longer than expected</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="block mx-auto text-xs text-muted-foreground underline mt-2"
            >
              Return to sign in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">
              {phase === 'navigating' ? 'Opening app…' : 'Signing you in…'}
            </p>
          </>
        )}

        {/* TEMPORARY: Debug info visible only with flag */}
        {showDebug && (
          <div className="mt-4 text-left bg-muted/50 rounded p-2 max-w-xs mx-auto max-h-48 overflow-y-auto">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">
              Phase: <span className="text-foreground">{phase}</span>
            </p>
            {debugInfo.map((line, i) => (
              <p key={i} className="text-[10px] font-mono text-muted-foreground">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
