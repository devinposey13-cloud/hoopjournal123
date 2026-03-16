import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_PRICES: Record<string, number> = {
  starter: 7.99,
  pro: 7.99,
  elite: 17.99,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const todayDate = new Date().toISOString().split('T')[0];

    // New signups in last 24h
    const { count: newSignups } = await supabase
      .from('account_approval_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    // Paid conversions in last 24h (users whose plan changed to paid recently)
    const { count: paidConversions } = await supabase
      .from('plan_overrides')
      .select('*', { count: 'exact', head: true })
      .neq('subscription_plan', 'free')
      .gte('updated_at', twentyFourHoursAgo);

    // Cancellations in last 24h (users who reverted to free recently)
    const { count: cancellations } = await supabase
      .from('plan_overrides')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_plan', 'free')
      .gte('updated_at', twentyFourHoursAgo);

    // Active paid subscribers by plan
    const { data: activePaid } = await supabase
      .from('plan_overrides')
      .select('subscription_plan')
      .neq('subscription_plan', 'free');

    const planCounts: Record<string, number> = {};
    let estimatedMonthlyRevenue = 0;

    if (activePaid) {
      for (const row of activePaid) {
        const plan = row.subscription_plan.toLowerCase();
        planCounts[plan] = (planCounts[plan] || 0) + 1;
        estimatedMonthlyRevenue += PLAN_PRICES[plan] || 0;
      }
    }

    const totalPaid = activePaid?.length || 0;
    const estimatedDailyRevenue = (estimatedMonthlyRevenue / 30).toFixed(2);

    const planBreakdown = Object.entries(planCounts)
      .map(([plan, count]) => `${plan}: ${count}`)
      .join(', ') || 'None';

    const summary = [
      `📈 *New Signups:* ${newSignups || 0}`,
      `💳 *Paid Conversions:* ${paidConversions || 0}`,
      `🔄 *Cancellations:* ${cancellations || 0}`,
      `👥 *Total Paid Subscribers:* ${totalPaid}`,
      `📊 *Plan Breakdown:* ${planBreakdown}`,
      `💰 *Est. Monthly Revenue:* $${estimatedMonthlyRevenue.toFixed(2)}`,
      `💵 *Est. Daily Revenue:* $${estimatedDailyRevenue}`,
    ].join('\n');

    // Send via send-slack-alert
    await fetch(`${supabaseUrl}/functions/v1/send-slack-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        category: 'admin_audit',
        severity: 'info',
        title: '📊 Daily Revenue Digest',
        summary,
        details: {
          'New Signups': String(newSignups || 0),
          'Paid Conversions': String(paidConversions || 0),
          'Cancellations': String(cancellations || 0),
          'Total Paid': String(totalPaid),
          'Est. Monthly Revenue': `$${estimatedMonthlyRevenue.toFixed(2)}`,
          'Est. Daily Revenue': `$${estimatedDailyRevenue}`,
        },
        dedup_key: `revenue_digest_${todayDate}`,
      }),
    });

    return new Response(JSON.stringify({ 
      sent: true, 
      newSignups: newSignups || 0,
      paidConversions: paidConversions || 0,
      cancellations: cancellations || 0,
      totalPaid,
      estimatedDailyRevenue,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Daily revenue digest error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
