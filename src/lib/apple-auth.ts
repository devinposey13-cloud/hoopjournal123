/**
 * Apple Sign In — platform-aware implementation.
 *
 * iOS (Despia): Apple JS SDK → native Face ID dialog (instant)
 * Android (Despia): oauth:// protocol → ASWebAuthenticationSession → form_post
 * Web: Apple JS SDK → browser dialog (instant)
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativeApp, getPlatform } from '@/lib/platform';

// The Apple Service ID (public identifier, safe for frontend)
// TODO: Replace with your actual Apple Service ID
const APPLE_CLIENT_ID = 'com.hoopjournal.web';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const APP_URL = 'https://hoopjournal.me';
const NATIVE_URL_SCHEME = 'hoopjournal';

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
        redirectURI: `${APP_URL}/auth/apple/callback`,
        usePopup: false,
      });
      console.log('[AppleAuth] JS SDK initialized');
    } catch (err) {
      console.warn('[AppleAuth] JS SDK init error:', err);
    }
  } else {
    console.warn('[AppleAuth] Apple JS SDK not loaded');
  }
}

/**
 * iOS/Web: Sign in using the Apple JS SDK (native dialog).
 * Returns the id_token, authorization code, and optional user info.
 */
export async function signInWithAppleJS(): Promise<{
  idToken: string;
  code: string;
  user?: { name?: { firstName?: string; lastName?: string }; email?: string };
}> {
  if (!window.AppleID) {
    throw new Error('Apple Sign In SDK not loaded');
  }

  try {
    const response = await window.AppleID.auth.signIn();
    return {
      idToken: response.authorization.id_token,
      code: response.authorization.code,
      user: response.user,
    };
  } catch (error: any) {
    if (error?.error === 'popup_closed_by_user') {
      throw new Error('Sign in cancelled');
    }
    throw error;
  }
}

/**
 * Android: Sign in via oauth:// protocol (opens ASWebAuthenticationSession).
 * Apple will POST back to the edge function which redirects with tokens.
 */
export function signInWithAppleOAuthProtocol(): void {
  if (!APPLE_CLIENT_ID || !SUPABASE_URL) {
    throw new Error('Apple Sign In not configured');
  }

  const state = `${crypto.randomUUID()}|android|${NATIVE_URL_SCHEME}`;

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    redirect_uri: `${SUPABASE_URL}/functions/v1/auth-apple-callback`,
    state,
  });

  const appleAuthUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

  // Despia oauth:// bridge opens the URL in ASWebAuthenticationSession
  window.location.href = `oauth://?url=${encodeURIComponent(appleAuthUrl)}`;
}

/**
 * Exchange Apple id_token for Supabase session tokens via edge function.
 * Used by iOS and Web flows after receiving id_token from JS SDK.
 */
export async function exchangeAppleToken(
  idToken: string,
  code: string,
  user?: { name?: { firstName?: string; lastName?: string }; email?: string },
  platform?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/auth-apple-callback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: idToken,
        code,
        user: user ? JSON.stringify(user) : null,
        platform: platform || getPlatform(),
      }),
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.access_token || !data.refresh_token) {
    throw new Error('No tokens returned from server');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Set Supabase session from Apple auth tokens.
 */
export async function setAppleSession(
  accessToken: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  } catch {
    return false;
  }
}
