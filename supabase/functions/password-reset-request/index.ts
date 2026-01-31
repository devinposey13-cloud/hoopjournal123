import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetPayload {
  phone: string;
  playerName?: string;
  turnstileToken: string;
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
  
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for database access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIP = getClientIP(req);

    // Check IP-based rate limit first (10 attempts per 15 minutes, 30 min block)
    const { data: rateLimitResult, error: rateLimitError } = await supabaseClient
      .rpc('check_rate_limit', {
        p_identifier: clientIP,
        p_action: 'password_reset_request',
        p_max_attempts: 10,
        p_window_seconds: 900,
        p_block_seconds: 1800
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue without rate limiting if there's an error
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retry_after || 1800)
          } 
        }
      );
    }

    const { phone, playerName, turnstileToken }: PasswordResetPayload = await req.json();

    // Validate required fields
    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!turnstileToken || typeof turnstileToken !== 'string') {
      return new Response(
        JSON.stringify({ error: 'CAPTCHA verification is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (basic validation)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate player name length if provided
    if (playerName && playerName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Player name is too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Turnstile CAPTCHA
    const isCaptchaValid = await verifyTurnstile(turnstileToken, clientIP);
    if (!isCaptchaValid) {
      return new Response(
        JSON.stringify({ error: 'CAPTCHA verification failed. Please try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = `+1${normalizedPhone}`;
    } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
      normalizedPhone = `+${normalizedPhone}`;
    } else if (!phone.startsWith('+')) {
      normalizedPhone = `+${normalizedPhone}`;
    } else {
      normalizedPhone = phone;
    }

    // Look up the user by phone number in player_settings
    const { data: playerData } = await supabaseClient
      .from('player_settings')
      .select('user_id, name')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    // Check for recent requests from same phone (per-phone rate limiting)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentRequests } = await supabaseClient
      .from('password_reset_requests')
      .select('id')
      .eq('phone', normalizedPhone)
      .gte('created_at', fiveMinutesAgo);

    if (recentRequests && recentRequests.length > 0) {
      return new Response(
        JSON.stringify({ error: 'A reset request was recently submitted. Please wait a few minutes before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the password reset request
    const { error: insertError } = await supabaseClient
      .from('password_reset_requests')
      .insert({
        user_id: playerData?.user_id || null,
        phone: normalizedPhone,
        player_name: playerData?.name || playerName || null,
        status: 'pending'
      });

    if (insertError) {
      console.error('Error creating reset request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit reset request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset request submitted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Password reset request error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
