import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find paid users
    const { data: paidUsers, error: paidError } = await supabase
      .from('plan_overrides')
      .select('user_id, subscription_plan')
      .neq('subscription_plan', 'free');

    if (paidError || !paidUsers || paidUsers.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let alertsSent = 0;

    for (const pu of paidUsers) {
      // Get most recent game
      const { data: recentGame } = await supabase
        .from('games')
        .select('date')
        .eq('user_id', pu.user_id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastGameDate = recentGame?.date;
      const isInactive = !lastGameDate || lastGameDate < fourteenDaysAgo;

      if (isInactive) {
        // Get player name for context
        const { data: profile } = await supabase
          .from('player_settings')
          .select('name, display_name')
          .eq('user_id', pu.user_id)
          .eq('is_active_profile', true)
          .maybeSingle();

        const playerName = profile?.display_name || profile?.name || 'Unknown';
        const daysSince = lastGameDate
          ? Math.floor((Date.now() - new Date(lastGameDate).getTime()) / (1000 * 60 * 60 * 24))
          : 'never';

        // Send churn risk alert via send-slack-alert function
        await fetch(`${supabaseUrl}/functions/v1/send-slack-alert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            category: 'churn_risk',
            severity: 'warning',
            title: 'Churn Risk Detected',
            summary: `Paid user "${playerName}" (${pu.subscription_plan}) hasn't logged a game in ${daysSince === 'never' ? 'ever' : `${daysSince} days`}.`,
            details: {
              'Player': playerName,
              'Plan': pu.subscription_plan,
              'Last Game': daysSince === 'never' ? 'Never' : `${daysSince} days ago`,
            },
            dedup_key: `churn_${pu.user_id}`,
          }),
        });
        alertsSent++;
      }
    }

    return new Response(JSON.stringify({ checked: paidUsers.length, alertsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Churn risk check error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
