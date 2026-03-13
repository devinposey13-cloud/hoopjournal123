

## Problem

Google returns `403 disallowed_useragent` because `@capacitor/browser` opens an **SFSafariViewController** (or ASWebAuthenticationSession), but the OAuth flow is still being initiated from inside the WebView context. Google's policy requires either a full external Safari browser or the **native Google Sign-In SDK**. The most reliable fix for a Capacitor iOS app is to use the **`@codetrix-studio/capacitor-google-auth` plugin**, which wraps the native Google Sign-In SDK and returns an ID token that can be exchanged via `supabase.auth.signInWithIdToken()`.

## Approach

Use the Capacitor Google Auth plugin for native builds. On web, keep the existing `lovable.auth.signInWithOAuth("google")` flow unchanged.

### 1. Add the Capacitor Google Auth plugin

Install `@codetrix-studio/capacitor-google-auth` — this wraps Apple's native `GIDSignIn` SDK on iOS.

### 2. Create a native Google sign-in helper

New file: `src/lib/nativeGoogleAuth.ts`

- Import `@codetrix-studio/capacitor-google-auth`
- Call `GoogleAuth.signIn()` which presents the native Google sign-in sheet (no WebView)
- Extract the `idToken` from the result
- Call `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })` to create/hydrate the session
- Return success/error

### 3. Update `AuthForm.tsx` — branch on `isNativeApp()`

In `handleGoogleSignIn`:
- If `isNativeApp()` → call the new native helper instead of `lovable.auth.signInWithOAuth`
- If web → keep existing flow unchanged

### 4. Initialize the plugin

In `App.tsx` or `main.tsx`, call `GoogleAuth.initialize()` on app startup when `isNativeApp()` is true, passing the Google client ID.

### 5. Store the Google OAuth Client ID

You'll need a **Google OAuth iOS Client ID** from your Google Cloud Console (type: iOS application, with your app's bundle ID). This is a public client ID (not a secret) so it can be stored in the codebase.

### User action required after changes

1. Create an **iOS OAuth Client ID** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) for bundle ID `app.lovable.2cd79f530f3e4e88858df49e60e86e08`
2. Add the reversed client ID as a URL scheme in Xcode (e.g. `com.googleusercontent.apps.XXXX`)
3. `npm install` → `npx cap sync` → rebuild in Xcode → TestFlight

### What stays the same
- Apple Sign-In flow (already uses system browser, Apple doesn't block WebViews the same way)
- Web/PWA Google flow (uses `lovable.auth.signInWithOAuth`)
- The `OAuthCallback` page, deep-link listener, and all other auth infrastructure

