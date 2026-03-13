/**
 * Native Google Sign-In for Capacitor iOS/Android.
 * Uses the native Google Sign-In SDK via @codetrix-studio/capacitor-google-auth,
 * which avoids the WebView and satisfies Google's "use secure browsers" policy.
 */

import { supabase } from '@/integrations/supabase/client';

// Replace this with your actual iOS OAuth Client ID from Google Cloud Console
export const GOOGLE_IOS_CLIENT_ID = 'REPLACE_WITH_YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

/** Initialize the Google Auth plugin. Call once on app startup when native. */
export async function initNativeGoogleAuth(): Promise<void> {
  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    GoogleAuth.initialize({
      clientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('[NativeGoogleAuth] Initialized');
  } catch (err) {
    console.warn('[NativeGoogleAuth] Failed to initialize:', err);
  }
}

/** Perform native Google sign-in and hydrate the Supabase session. */
export async function nativeGoogleSignIn(): Promise<void> {
  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

  console.log('[NativeGoogleAuth] Starting sign-in...');
  const googleUser = await GoogleAuth.signIn();

  const idToken = googleUser.authentication?.idToken;
  if (!idToken) {
    throw new Error('No ID token received from Google Sign-In');
  }

  console.log('[NativeGoogleAuth] Got ID token, exchanging with backend...');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw error;
  }

  console.log('[NativeGoogleAuth] Session established successfully');
}
