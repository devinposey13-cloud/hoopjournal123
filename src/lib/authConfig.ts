/**
 * Centralized auth configuration for Hoop Journal.
 *
 * All OAuth redirect URIs, domain references, and provider-specific
 * constants live here so they can be updated in one place when
 * switching to a branded Supabase custom auth domain.
 *
 * ═══════════════════════════════════════════════════════════════════
 *  BRANDED AUTH DOMAIN MIGRATION CHECKLIST
 * ═══════════════════════════════════════════════════════════════════
 *
 *  1. SUPABASE CUSTOM DOMAIN
 *     - In the Supabase Dashboard → Settings → Custom Domains, add
 *       "auth.hoopjournal.me" as your custom auth domain.
 *     - Verify the domain with the required DNS CNAME record:
 *         auth.hoopjournal.me  CNAME  <value-from-supabase>
 *     - Wait for Supabase to issue and activate the TLS certificate.
 *     - Once active, Supabase will serve auth endpoints from
 *       https://auth.hoopjournal.me instead of
 *       https://<project-ref>.supabase.co.
 *
 *  2. GOOGLE OAUTH CONSENT SCREEN
 *     - Google Cloud Console → APIs & Services → OAuth Consent Screen
 *     - Add "hoopjournal.me" to Authorized Domains.
 *     - Under Credentials → OAuth 2.0 Client IDs, update
 *       Authorized redirect URIs to include:
 *         • https://auth.hoopjournal.me/auth/v1/callback
 *         • https://hoopjournal.me/~oauth/callback
 *         • https://hoopjournal123.lovable.app/~oauth/callback
 *       Remove or keep the old *.supabase.co redirect URI during
 *       the transition period, then remove once verified.
 *
 *  3. APPLE SIGN IN (Services ID)
 *     - Apple Developer → Certificates, Identifiers & Profiles →
 *       Services IDs → your Service ID (com.despia.hoopjourney.AppleAuth)
 *     - Under "Sign In with Apple" → Website URLs:
 *         Return URL: https://auth.hoopjournal.me/auth/v1/callback
 *     - Also keep https://hoopjournal.me/auth/apple/callback for
 *       the JS SDK popup flow.
 *
 *  4. SUPABASE AUTH REDIRECT ALLOWLIST
 *     - Supabase Dashboard → Authentication → URL Configuration
 *     - Ensure these are in the Redirect URLs allowlist:
 *         • https://hoopjournal.me/**
 *         • https://hoopjournal123.lovable.app/**
 *         • hoopjournal://oauth/**
 *     - Remove any *.supabase.co user-facing callback URLs once
 *       the custom domain is confirmed active.
 *
 *  5. ENVIRONMENT VARIABLES
 *     - VITE_SUPABASE_URL will continue to point to the project
 *       REST/Realtime endpoint. The auth domain is separate.
 *     - No .env changes are required for the custom auth domain;
 *       Supabase handles the routing internally once configured.
 *
 *  6. DOMAIN VERIFICATION
 *     - Ensure auth.hoopjournal.me has a valid DNS CNAME to
 *       Supabase's custom domain target.
 *     - Confirm TLS certificate is active via browser or:
 *         curl -I https://auth.hoopjournal.me/auth/v1/health
 *     - Test OAuth end-to-end on all platforms (web, iOS, Android)
 *       before removing legacy *.supabase.co redirect URIs.
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// ── App Domains ─────────────────────────────────────────────────────

/** Primary custom domain for the app (user-facing) */
export const APP_DOMAIN = 'hoopjournal.me';
export const APP_ORIGIN = `https://${APP_DOMAIN}`;

/** Published Lovable domain (fallback / broker endpoint) */
export const PUBLISHED_DOMAIN = 'hoopjournal123.lovable.app';
export const PUBLISHED_ORIGIN = `https://${PUBLISHED_DOMAIN}`;

/**
 * Branded Supabase custom auth domain.
 *
 * Once configured in Supabase Dashboard → Custom Domains, all
 * auth API calls (OAuth redirects, token exchange, etc.) will be
 * served from this domain instead of <project>.supabase.co.
 *
 * Set to null to use the default Supabase auth domain.
 */
export const CUSTOM_AUTH_DOMAIN: string | null = null;
// TODO: Enable once Supabase custom domain is verified:
// export const CUSTOM_AUTH_DOMAIN = 'auth.hoopjournal.me';

// ── OAuth Callback Paths ────────────────────────────────────────────

/** Web callback path (same for custom domain and lovable.app) */
export const OAUTH_CALLBACK_PATH = '/auth/callback';

/** Native deep-link scheme */
export const NATIVE_URL_SCHEME = 'hoopjournal';

// ── Redirect URI Helpers ────────────────────────────────────────────

/** Returns true if running on the custom domain */
export const isCustomDomain = (): boolean =>
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  window.location.hostname !== 'localhost';

/**
 * Get the OAuth callback redirect URI for the current platform.
 *
 * - Custom domain (hoopjournal.me) → https://hoopjournal.me/auth/callback
 * - Lovable preview/published → current origin (Lovable broker handles it)
 * - Native (Despia) → https://hoopjournal.me/auth/callback
 */
export function getOAuthRedirectUri(options?: { forNative?: boolean }): string {
  if (options?.forNative) {
    return `${APP_ORIGIN}${OAUTH_CALLBACK_PATH}`;
  }

  if (isCustomDomain()) {
    return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
  }

  // On lovable.app, the Lovable OAuth broker handles the redirect
  return window.location.origin;
}

// ── Apple Auth ──────────────────────────────────────────────────────

/**
 * Apple Service ID (public identifier).
 * Must match what's configured in both Apple Developer Console
 * and Lovable Cloud Auth Settings.
 */
export const APPLE_CLIENT_ID = 'com.despia.hoopjourney.AppleAuth';

/**
 * Apple JS SDK redirect URI for the popup/redirect flow.
 * This is NOT the Supabase auth callback — it's the Apple-specific
 * return URL configured in the Apple Services ID.
 */
export const APPLE_REDIRECT_URI = `${APP_ORIGIN}/auth/apple/callback`;
