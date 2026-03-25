/**
 * Apple Sign In — platform-aware implementation following Despia architecture.
 *
 * iOS (Despia): Apple JS SDK → Native Face ID dialog → POST to edge function → setSession
 * Android (Despia): oauth:// protocol → form_post to edge function → deeplink return
 * Web: Apple JS SDK → browser dialog → POST to edge function → setSession
 *
 * The edge function (auth-apple-callback) handles token verification and user
 * creation, NOT Supabase's built-in signInWithIdToken.
 *
 * INSTRUMENTED: All stages log to appleAuthAudit for diagnostics.
 */

import { supabase } from '@/integrations/supabase/client';
import { getPlatform } from '@/lib/platform';
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI } from '@/lib/authConfig';
import {
  logAppleAuthEvent,
  updateAppleAuthMetadata,
  maskToken,
} from '@/lib/appleAuthAudit';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            name?: { firstName?: string; lastName?: string };
            email?: string;
          };
        }>;
      };
    };
  }
}

/** Initialize Apple JS SDK (call once on app boot — iOS and Web only) */
export function initAppleAuth(): void {
  const platform = getPlatform();

  // Android uses oauth:// flow, no JS SDK needed
  if (platform === 'android') return;
  if (!APPLE_CLIENT_ID) return;

  if (window.AppleID) {
    try {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: false,
      });
      console.log('[AppleAuth] JS SDK initialized with clientId:', APPLE_CLIENT_ID);
    } catch (err) {
      console.warn('[AppleAuth] JS SDK init error:', err);
    }
  } else {
    console.warn('[AppleAuth] Apple JS SDK not loaded yet');
  }
}

/**
 * Sign in using the Apple JS SDK (iOS and Web).
 *
 * Triggers the native Apple dialog (Face ID on iOS, browser popup on web),
 * then POSTs the id_token to our auth-apple-callback edge function to
 * verify the token and create a Supabase session.
 *
 * Each stage is logged to the Apple Auth Audit trail.
 */
export async function signInWithAppleNative(): Promise<void> {
  // Stage: JS SDK invocation
  logAppleAuthEvent('js_sdk_invoked', {
    sdkAvailable: !!window.AppleID,
    clientId: APPLE_CLIENT_ID,
    redirectURI: APPLE_REDIRECT_URI,
  });

  if (!window.AppleID) {
    updateAppleAuthMetadata({ sdkErrorMessage: 'Apple Sign In SDK not loaded' });
    throw new Error('Apple Sign In SDK not loaded');
  }

  // 1. Trigger native Apple Sign In dialog via JS SDK
  let response;
  try {
    response = await window.AppleID.auth.signIn();
  } catch (error: any) {
    // Stage: JS SDK error response
    const errorCode = error?.error || 'unknown';
    const errorMsg = error?.message || error?.error || String(error);

    logAppleAuthEvent('js_sdk_response', {
      success: false,
      errorCode,
      errorMessage: errorMsg,
    });
    updateAppleAuthMetadata({
      providerErrorCode: errorCode,
      providerErrorMessage: errorMsg,
    });

    if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') {
      throw new Error('Sign in cancelled');
    }
    throw error;
  }

  // Stage: JS SDK response received
  const hasAuthorization = !!response?.authorization;
  const hasIdToken = !!response?.authorization?.id_token;
  const hasCode = !!response?.authorization?.code;
  const hasUser = !!response?.user;
  const tokenInfo = maskToken(response?.authorization?.id_token);

  logAppleAuthEvent('js_sdk_response', {
    success: true,
    hasAuthorization,
    hasIdToken,
    hasCode,
    hasUser,
    tokenPresent: tokenInfo.present,
    tokenLength: tokenInfo.length,
    userEmail: response?.user?.email ? '***@***' : undefined,
  });

  if (!hasAuthorization) {
    updateAppleAuthMetadata({ providerErrorMessage: 'No authorization in Apple response' });
    throw new Error('Sign in cancelled');
  }

  const idToken = response.authorization.id_token;
  const code = response.authorization.code;

  if (!idToken) {
    updateAppleAuthMetadata({ providerErrorMessage: 'No id_token in Apple authorization' });
    throw new Error('No identity token received from Apple');
  }

  updateAppleAuthMetadata({
    tokenPresent: true,
    tokenLength: idToken.length,
  });

  console.log('[AppleAuth] Got id_token from Apple JS SDK, posting to edge function...');

  // 2. POST to our custom edge function (NOT supabase.auth.signInWithIdToken)
  logAppleAuthEvent('token_exchange_started', {
    provider: 'apple',
    tokenLength: idToken.length,
    method: 'edge_function',
  });

  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-apple-callback`;

  let edgeResponse: Response;
  try {
    edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: idToken,
        code,
        user: response.user ? JSON.stringify(response.user) : null,
        platform: getPlatform(),
      }),
    });
  } catch (fetchError: any) {
    logAppleAuthEvent('token_exchange_result', {
      success: false,
      errorMessage: fetchError.message,
      errorType: 'network',
    });
    updateAppleAuthMetadata({ sdkErrorMessage: `Edge function network error: ${fetchError.message}` });
    throw new Error(`Apple auth failed: network error contacting server`);
  }

  const edgeData = await edgeResponse.json();

  logAppleAuthEvent('token_exchange_result', {
    success: edgeResponse.ok,
    status: edgeResponse.status,
    hasAccessToken: !!edgeData.access_token,
    hasRefreshToken: !!edgeData.refresh_token,
    errorMessage: edgeData.error,
    userId: edgeData.user_id?.slice(0, 8),
  });

  if (!edgeResponse.ok || edgeData.error) {
    const errorMsg = edgeData.error || `Edge function returned ${edgeResponse.status}`;
    updateAppleAuthMetadata({ sdkErrorMessage: errorMsg });
    console.error('[AppleAuth] Edge function error:', errorMsg);
    throw new Error(errorMsg);
  }

  if (!edgeData.access_token || !edgeData.refresh_token) {
    updateAppleAuthMetadata({ sdkErrorMessage: 'No tokens returned from edge function' });
    throw new Error('No session tokens returned from server');
  }

  // 3. Set the Supabase session with the tokens from our edge function
  logAppleAuthEvent('session_creation_started', {
    method: 'setSession',
  });

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: edgeData.access_token,
    refresh_token: edgeData.refresh_token,
  });

  logAppleAuthEvent('session_creation_result', {
    success: !sessionError,
    hasSession: !!sessionData?.session,
    errorMessage: sessionError?.message,
    userId: sessionData?.session?.user?.id?.slice(0, 8),
  });

  if (sessionError) {
    updateAppleAuthMetadata({
      sdkErrorMessage: sessionError.message,
      providerErrorCode: (sessionError as any)?.code || (sessionError as any)?.status?.toString(),
    });
    console.error('[AppleAuth] setSession error:', sessionError);
    throw sessionError;
  }

  if (!sessionData.session) {
    updateAppleAuthMetadata({ sdkErrorMessage: 'No session returned after setSession' });
    throw new Error('No session returned after Apple sign in');
  }

  // Stage: Session creation succeeded
  logAppleAuthEvent('session_verified', {
    success: true,
    userId: sessionData.session.user.id.slice(0, 8),
    provider: sessionData.session.user.app_metadata?.provider,
    expiresAt: sessionData.session.expires_at,
  });
  updateAppleAuthMetadata({ sessionEstablished: true });

  console.log('[AppleAuth] Session established — user:', sessionData.session.user.id);
}

/** Returns true if the Apple JS SDK is available (iOS/Web) */
export function isAppleJSAvailable(): boolean {
  return !!window.AppleID;
}
