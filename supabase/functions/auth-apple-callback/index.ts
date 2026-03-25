/**
 * auth-apple-callback — Custom Apple Sign In edge function.
 *
 * Accepts both JSON (iOS/Web JS SDK) and form_post (Android oauth://).
 * Verifies Apple id_token against Apple's JWKS, creates/finds user via
 * Supabase Admin API, and returns session tokens.
 *
 * Following Despia's recommended architecture:
 * https://setup.despia.com/lovable/native-features/o-auth-2-0/apple-auth
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, authorization, x-client-info, apikey',
};

// Cache Apple's JWKS
let applePublicKeys: jose.JWTVerifyGetKey | null = null;
let keysLastFetched = 0;

async function getApplePublicKeys(): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  if (applePublicKeys && (now - keysLastFetched) < 24 * 60 * 60 * 1000) return applePublicKeys;
  applePublicKeys = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  keysLastFetched = now;
  return applePublicKeys;
}

async function verifyAppleToken(idToken: string, clientId: string): Promise<jose.JWTPayload> {
  const JWKS = await getApplePublicKeys();
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
  });
  return payload;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://hoopjournal.me';
  const clientId = Deno.env.get('APPLE_CLIENT_ID')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const contentType = req.headers.get('content-type') || '';
    let idToken: string;
    let userJson: string | null = null;
    let platform = 'web';
    let deeplinkScheme: string | undefined;

    // Handle both JSON (from JS SDK) and form_post (from iOS/Android redirect)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      idToken = body.id_token;
      userJson = body.user;
      platform = body.platform || 'web';
    } else {
      // iOS/Android: form_post from Apple authorize redirect
      const formData = await req.formData();
      idToken = formData.get('id_token') as string;
      userJson = formData.get('user') as string;
      const state = formData.get('state') as string;

      if (state?.includes('|')) {
        const parts = state.split('|');
        platform = parts[1];
        if (parts[2]) deeplinkScheme = parts[2];
      }
    }

    if (!idToken) {
      const errorMsg = 'No identity token provided';
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}` },
      });
    }

    // Verify Apple token against JWKS
    console.log('[auth-apple-callback] Verifying token against Apple JWKS...');
    const tokenPayload = await verifyAppleToken(idToken, clientId);
    const appleUserId = tokenPayload.sub as string;
    const email = tokenPayload.email as string | undefined;
    console.log(`[auth-apple-callback] Token verified. Apple sub: ${appleUserId?.slice(0, 8)}...`);

    // Parse user info (Apple only sends this on first sign-in)
    let displayName = 'Apple User';
    let firstName = '';
    let lastName = '';
    if (userJson) {
      try {
        const userData = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        if (userData.name) {
          firstName = userData.name.firstName || '';
          lastName = userData.name.lastName || '';
          displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Apple User';
        }
      } catch { /* ignore parse errors */ }
    }

    const userEmail = email || `${appleUserId}@privaterelay.appleid.com`;

    // Admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Public client for OTP verification (generates proper session)
    const supabasePublic = createClient(supabaseUrl, anonKey);

    // Create or find user
    let userId: string;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      email_confirm: true,
      user_metadata: {
        apple_user_id: appleUserId,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        full_name: displayName,
        provider: 'apple',
      },
    });

    if (createError?.message?.includes('already been registered')) {
      // User exists — find them
      console.log('[auth-apple-callback] User already registered, looking up by email...');
      const { data: filteredData } = await supabaseAdmin.auth.admin.listUsers({
        filter: userEmail,
        perPage: 1,
      });
      const existingUser = filteredData?.users?.find(
        (u) => u.email === userEmail || u.user_metadata?.apple_user_id === appleUserId
      );

      if (!existingUser) {
        const errorMsg = 'User not found after registration conflict';
        console.error(`[auth-apple-callback] ${errorMsg}`);
        if (contentType.includes('application/json')) {
          return new Response(JSON.stringify({ error: errorMsg }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}` },
        });
      }

      userId = existingUser.id;
      console.log(`[auth-apple-callback] Found existing user: ${userId.slice(0, 8)}...`);

      // Update name if provided (Apple only sends name on first sign-in)
      if (firstName || lastName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            display_name: displayName,
            first_name: firstName,
            last_name: lastName,
            full_name: displayName,
          },
        });
      }
    } else if (createError) {
      const errorMsg = `Failed to create user: ${createError.message}`;
      console.error(`[auth-apple-callback] ${errorMsg}`);
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}` },
      });
    } else {
      userId = createData.user.id;
      console.log(`[auth-apple-callback] Created new user: ${userId.slice(0, 8)}...`);
    }

    // Generate session via magiclink + OTP verification
    console.log('[auth-apple-callback] Generating session...');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError || !linkData) {
      const errorMsg = `Failed to generate session link: ${linkError?.message || 'unknown'}`;
      console.error(`[auth-apple-callback] ${errorMsg}`);
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}` },
      });
    }

    const { data: sessionData, error: sessionError } = await supabasePublic.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (sessionError || !sessionData.session) {
      const errorMsg = `Failed to create session: ${sessionError?.message || 'no session returned'}`;
      console.error(`[auth-apple-callback] ${errorMsg}`);
      if (contentType.includes('application/json')) {
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(errorMsg)}` },
      });
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;
    console.log(`[auth-apple-callback] Session created for user: ${userId.slice(0, 8)}...`);

    // Return tokens based on request type
    if (contentType.includes('application/json')) {
      // iOS/Web: Return JSON
      return new Response(
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          user_id: userId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // iOS/Android form_post: Redirect with tokens
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (platform === 'android' && deeplinkScheme) {
        return new Response(null, {
          status: 302,
          headers: { 'Location': `${deeplinkScheme}://oauth/auth?${params}` },
        });
      }
      // iOS Despia & fallback: redirect to /auth/callback with tokens as query params
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?${params}` },
      });
    }
  } catch (error) {
    console.error('[auth-apple-callback] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const contentType = req.headers.get('content-type') || '';
    const appUrl = Deno.env.get('APP_URL') || 'https://hoopjournal.me';

    // For form_post flows (iOS redirect), redirect to app error page instead of raw JSON
    if (!contentType.includes('application/json')) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${appUrl}/auth/callback?error=${encodeURIComponent(message)}` },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
