/**
 * Apple Sign In — platform-aware implementation.
 *
 * iOS (Despia): Direct redirect to Apple authorize URL → native WebKit dialog →
 *               form_post to edge function → redirect back with tokens
 * Android (Despia): oauth:// protocol → browser → form_post to edge function → deeplink
 * Web: Apple JS SDK → browser dialog → POST to edge function → setSession
 */

import { supabase } from '@/integrations/supabase/client';
import { getPlatform, isDespiaIOS } from '@/lib/platform';
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI } from '@/lib/authConfig';

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

/** Initialize Apple JS SDK (call once on app boot — Web only) */
export function initAppleAuth(): void {
  if (getPlatform() === 'android') return;
  if (isDespiaIOS()) return;
  if (!APPLE_CLIENT_ID) return;

  if (window.AppleID) {
    try {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: true,
      });
    } catch (err) {
      console.warn('[AppleAuth] JS SDK init error:', err);
    }
  }
}

/** Build Apple authorize URL for direct redirect flows (iOS Despia). */
function buildAppleAuthorizeUrl(state: string): string {
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-apple-callback`;
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    redirect_uri: edgeFunctionUrl,
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/** iOS Despia: Direct redirect to Apple's authorize URL. */
export function signInWithAppleRedirect(): void {
  const state = `${crypto.randomUUID()}|ios|hoopjournal`;
  window.location.href = buildAppleAuthorizeUrl(state);
}

/** Web: Apple JS SDK → edge function → setSession. */
export async function signInWithAppleNative(): Promise<void> {
  if (!window.AppleID) {
    throw new Error('Apple Sign In SDK not loaded');
  }

  // 1. Trigger Apple Sign In dialog
  let response;
  try {
    response = await window.AppleID.auth.signIn();
  } catch (error: any) {
    if (error?.error === 'popup_closed_by_user' || error?.error === 'user_cancelled_authorize') {
      throw new Error('Sign in cancelled');
    }
    throw error;
  }

  if (!response?.authorization) {
    throw new Error('Sign in cancelled');
  }

  const idToken = response.authorization.id_token;
  if (!idToken) {
    throw new Error('No identity token received from Apple');
  }

  // 2. POST to edge function
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-apple-callback`;
  let edgeResponse: Response;
  try {
    edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: idToken,
        code: response.authorization.code,
        user: response.user ? JSON.stringify(response.user) : null,
        platform: getPlatform(),
      }),
    });
  } catch (fetchError: any) {
    throw new Error('Apple auth failed: network error contacting server');
  }

  const edgeData = await edgeResponse.json();

  if (!edgeResponse.ok || edgeData.error) {
    throw new Error(edgeData.error || `Edge function returned ${edgeResponse.status}`);
  }

  if (!edgeData.access_token || !edgeData.refresh_token) {
    throw new Error('No session tokens returned from server');
  }

  // 3. Set session
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: edgeData.access_token,
    refresh_token: edgeData.refresh_token,
  });

  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error('No session returned after Apple sign in');
  }

  console.log('[AppleAuth] Session established — user:', sessionData.session.user.id);
}

/** Returns true if the Apple JS SDK is available (Web only) */
export function isAppleJSAvailable(): boolean {
  return !!window.AppleID;
}
