import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { card_id, token: claimToken, player_name, jersey_number, team_name, action } = body;

    // Handle recovery request submission
    if (action === 'request_access') {
      if (!card_id || !player_name || !jersey_number || !team_name) {
        return new Response(JSON.stringify({ error: 'Missing fields for recovery request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { error: insertError } = await supabaseAdmin.from('claim_recovery_requests').insert({
        card_id,
        entered_name: player_name.trim(),
        entered_team: team_name.trim(),
        entered_jersey: parseInt(jersey_number),
        entered_email: body.email || null,
        user_id: userId,
      });
      if (insertError) throw insertError;
      return new Response(JSON.stringify({ success: true, message: 'Recovery request submitted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Standard claim flow
    if (!card_id || !claimToken) {
      return new Response(JSON.stringify({ error: 'Missing card_id or token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Rate limit check
    const { data: rateResult } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: card_id,
      p_action: 'card_claim',
      p_max_attempts: 5,
      p_window_seconds: 3600,
      p_block_seconds: 900,
    });

    if (rateResult && !rateResult.allowed) {
      return new Response(JSON.stringify({
        error: 'rate_limited',
        message: rateResult.message || 'Too many attempts. Try again later.',
        retry_after: rateResult.retry_after,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Lookup card (using admin to bypass RLS)
    const { data: card, error: cardError } = await supabaseAdmin
      .from('quick_cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: 'Card not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate token
    if (card.claim_token !== claimToken) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if already claimed by someone else
    if (card.claim_status === 'claimed' && card.claimed_by_user_id && card.claimed_by_user_id !== userId) {
      return new Response(JSON.stringify({ error: 'already_claimed', message: 'This card has already been claimed by another account' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If action is 'preview', return card data for preview (no verification needed)
    if (action === 'preview') {
      const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
      return new Response(JSON.stringify({
        preview: {
          player_name: card.player_name,
          team_name: card.team_name,
          jersey_number: card.jersey_number,
          position: card.position,
          photo_url: card.photo_url,
          grade: card.grade,
        },
        expired: isExpired,
        claim_status: card.claim_status,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verification required for claim
    if (!player_name || jersey_number === undefined || jersey_number === null) {
      return new Response(JSON.stringify({ error: 'Player name and jersey number are required for verification' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
    const nameMatch = card.player_name.trim().toLowerCase() === String(player_name).trim().toLowerCase();
    const jerseyMatch = card.jersey_number === parseInt(jersey_number);

    if (isExpired) {
      // Expired: require name + team + jersey
      if (!team_name) {
        return new Response(JSON.stringify({ error: 'expired', message: 'This card has expired. Team name is also required for recovery.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const teamMatch = card.team_name.trim().toLowerCase() === String(team_name).trim().toLowerCase();
      if (!nameMatch || !jerseyMatch || !teamMatch) {
        // Increment attempts
        await supabaseAdmin.from('quick_cards').update({
          claim_attempts: (card.claim_attempts || 0) + 1,
          last_claim_attempt_at: new Date().toISOString(),
        }).eq('id', card_id);
        return new Response(JSON.stringify({ error: 'verification_failed', message: "This doesn't match the card details. Please try again." }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      // Standard: require name + jersey
      if (!nameMatch || !jerseyMatch) {
        await supabaseAdmin.from('quick_cards').update({
          claim_attempts: (card.claim_attempts || 0) + 1,
          last_claim_attempt_at: new Date().toISOString(),
        }).eq('id', card_id);
        return new Response(JSON.stringify({ error: 'verification_failed', message: "This doesn't match the card details. Please try again." }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Claim the card
    const { error: claimError } = await supabaseAdmin.from('quick_cards').update({
      claimed_by_user_id: userId,
      claim_status: 'claimed',
      recovery_claim: isExpired ? true : false,
    }).eq('id', card_id);

    if (claimError) throw claimError;

    // Update player profile
    const { error: profileError } = await supabaseAdmin.from('player_settings').update({
      name: card.player_name,
      team: card.team_name,
      position: card.position || 'Guard',
      number: card.jersey_number,
      avatar_url: card.photo_url,
      grade: card.grade,
      onboarding_completed_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('is_active_profile', true);

    if (profileError) throw profileError;

    return new Response(JSON.stringify({
      success: true,
      card: {
        player_name: card.player_name,
        team_name: card.team_name,
        jersey_number: card.jersey_number,
        position: card.position,
        photo_url: card.photo_url,
        grade: card.grade,
      },
      recovery_claim: !!isExpired,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('claim-card error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
