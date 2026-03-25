/**
 * Apple Sign In — platform-aware implementation using Lovable Cloud managed auth.
 *
 * iOS (Despia): Apple JS SDK → native Face ID dialog → signInWithIdToken
 * Android (Despia): lovable.auth.signInWithOAuth via oauth:// bridge
 * Web: lovable.auth.signInWithOAuth (managed redirect)
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
      console.log('[AppleAuth] JS SDK initialized');
    } catch (err) {
      console.warn('[AppleAuth] JS SDK init error:', err);
    }
  } else {
    console.warn('[AppleAuth] Apple JS SDK not loaded yet');
  }
}

/**
 * iOS/Web: Sign in using the Apple JS SDK (native dialog).
 * Gets id_token then exchanges it for a Supabase session via signInWithIdToken.
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

  // 1. Trigger native Apple Sign In dialog
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

  if (!idToken) {
    updateAppleAuthMetadata({ providerErrorMessage: 'No id_token in Apple authorization' });
    throw new Error('No identity token received from Apple');
  }

  updateAppleAuthMetadata({
    tokenPresent: true,
    tokenLength: idToken.length,
  });

  console.log('[AppleAuth] Got id_token from Apple JS SDK, exchanging for session...');

  // Stage: Token exchange
  logAppleAuthEvent('token_exchange_started', {
    provider: 'apple',
    tokenLength: idToken.length,
  });

  // 2. Exchange Apple id_token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  });

  logAppleAuthEvent('token_exchange_result', {
    success: !error,
    hasSession: !!data?.session,
    errorMessage: error?.message,
    errorStatus: (error as any)?.status,
    userId: data?.session?.user?.id?.slice(0, 8),
  });

  if (error) {
    updateAppleAuthMetadata({
      sdkErrorMessage: error.message,
      providerErrorCode: (error as any)?.code || (error as any)?.status?.toString(),
    });
    console.error('[AppleAuth] signInWithIdToken error:', error);
    throw error;
  }

  if (!data.session) {
    updateAppleAuthMetadata({ sdkErrorMessage: 'No session returned after signInWithIdToken' });
    throw new Error('No session returned after Apple sign in');
  }

  // Stage: Session creation succeeded
  logAppleAuthEvent('session_creation_result', {
    success: true,
    userId: data.session.user.id.slice(0, 8),
    provider: data.session.user.app_metadata?.provider,
    expiresAt: data.session.expires_at,
  });
  updateAppleAuthMetadata({ sessionEstablished: true });

  console.log('[AppleAuth] Session established — user:', data.session.user.id);
}

/** Returns true if the Apple JS SDK is available (iOS/Web) */
export function isAppleJSAvailable(): boolean {
  return !!window.AppleID;
}
