/**
 * Apple Sign In — platform-aware implementation using Lovable Cloud managed auth.
 *
 * iOS (Despia): Apple JS SDK → native Face ID dialog → signInWithIdToken
 * Android (Despia): lovable.auth.signInWithOAuth via oauth:// bridge
 * Web: lovable.auth.signInWithOAuth (managed redirect)
 */

import { supabase } from '@/integrations/supabase/client';
import { getPlatform } from '@/lib/platform';
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
 */
export async function signInWithAppleNative(): Promise<void> {
  if (!window.AppleID) {
    throw new Error('Apple Sign In SDK not loaded');
  }

  // 1. Trigger native Apple Sign In dialog
  let response;
  try {
    response = await window.AppleID.auth.signIn();
  } catch (error: any) {
    if (error?.error === 'popup_closed_by_user') {
      throw new Error('Sign in cancelled');
    }
    throw error;
  }

  const idToken = response.authorization.id_token;

  if (!idToken) {
    throw new Error('No identity token received from Apple');
  }

  console.log('[AppleAuth] Got id_token from Apple JS SDK, exchanging for session...');

  // 2. Exchange Apple id_token for a Supabase session
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
  });

  if (error) {
    console.error('[AppleAuth] signInWithIdToken error:', error);
    throw error;
  }

  if (!data.session) {
    throw new Error('No session returned after Apple sign in');
  }

  console.log('[AppleAuth] Session established — user:', data.session.user.id);
}

/** Returns true if the Apple JS SDK is available (iOS/Web) */
export function isAppleJSAvailable(): boolean {
  return !!window.AppleID;
}
