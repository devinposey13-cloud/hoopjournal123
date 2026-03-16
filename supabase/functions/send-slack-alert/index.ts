import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackAlertPayload {
  category: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  details?: Record<string, string>;
  cta_url?: string;
  cta_label?: string;
  dedup_key?: string;
  is_test?: boolean;
}

const SEVERITY_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

const SEVERITY_COLOR: Record<string, string> = {
  info: '#2563eb',
  warning: '#f59e0b',
  critical: '#ef4444',
};

const CATEGORY_LABELS: Record<string, string> = {
  new_user_signup: '👤 New User Signup',
  new_paid_subscription: '💳 New Paid Subscription',
  failed_payment: '❌ Failed Payment',
  canceled_subscription: '🔄 Canceled Subscription',
  new_support_request: '📩 Support Request',
  reported_content: '🚩 Reported Content',
  user_feedback: '💬 User Feedback',
  backend_failure: '🔥 Backend Failure',
  milestone_alert: '🏆 Milestone Reached',
  admin_audit: '🔒 Admin Action',
  churn_risk: '📉 Churn Risk',
  high_engagement: '🌟 High Engagement',
  test: '🧪 Test Alert',
};

function buildSlackMessage(payload: SlackAlertPayload): object {
  const severity = payload.severity || 'info';
  const emoji = SEVERITY_EMOJI[severity] || 'ℹ️';
  const color = SEVERITY_COLOR[severity] || '#2563eb';
  const categoryLabel = CATEGORY_LABELS[payload.category] || payload.category;

  const fields = [];
  if (payload.details) {
    for (const [key, value] of Object.entries(payload.details)) {
      if (value) {
        fields.push({ title: key, value, short: true });
      }
    }
  }

  const attachment: any = {
    color,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${payload.title}*${payload.is_test ? ' _(Test)_' : ''}\n${categoryLabel}\n\n${payload.summary}`,
        },
      },
    ],
  };

  if (fields.length > 0) {
    attachment.blocks.push({
      type: 'section',
      fields: fields.map(f => ({
        type: 'mrkdwn',
        text: `*${f.title}:*\n${f.value}`,
      })),
    });
  }

  if (payload.cta_url) {
    attachment.blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: payload.cta_label || 'View in Admin Console' },
          url: payload.cta_url,
          style: severity === 'critical' ? 'danger' : 'primary',
        },
      ],
    });
  }

  attachment.blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `🏀 Hoop Journal • ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`,
      },
    ],
  });

  return { attachments: [attachment] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload: SlackAlertPayload = await req.json();

    if (!payload.category || !payload.title || !payload.summary) {
      return new Response(JSON.stringify({ error: 'Missing required fields: category, title, summary' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this category is enabled (skip for test alerts)
    if (!payload.is_test) {
      const { data: pref } = await supabase
        .from('slack_alert_preferences')
        .select('is_enabled, severity, frequency, channel_override, quiet_hours_start, quiet_hours_end')
        .eq('category', payload.category)
        .maybeSingle();

      if (pref && !pref.is_enabled) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Category disabled' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use saved severity if not overridden
      if (pref?.severity && !payload.severity) {
        payload.severity = pref.severity as any;
      }

      // Check quiet hours
      if (pref?.quiet_hours_start && pref?.quiet_hours_end) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const start = parseInt(pref.quiet_hours_start.split(':')[0], 10);
        const end = parseInt(pref.quiet_hours_end.split(':')[0], 10);
        const inQuietHours = start < end
          ? currentHour >= start && currentHour < end
          : currentHour >= start || currentHour < end;
        
        if (inQuietHours && payload.severity !== 'critical') {
          return new Response(JSON.stringify({ skipped: true, reason: 'Quiet hours active' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Deduplication check (5-minute window)
    if (payload.dedup_key) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('slack_alert_history')
        .select('id')
        .eq('dedup_key', payload.dedup_key)
        .gte('created_at', fiveMinAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Duplicate alert within 5 min window' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get webhook URL
    const { data: config } = await supabase
      .from('slack_integration_config')
      .select('webhook_url, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!config || !config.webhook_url) {
      // Log as failed but don't error — Slack not configured
      await supabase.from('slack_alert_history').insert({
        category: payload.category,
        severity: payload.severity || 'info',
        title: payload.title,
        message_preview: payload.summary.substring(0, 200),
        delivery_status: 'failed',
        error_message: 'Slack not configured',
        dedup_key: payload.dedup_key,
      });

      return new Response(JSON.stringify({ sent: false, reason: 'Slack not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build and send Slack message
    const slackMessage = buildSlackMessage(payload);
    const slackResponse = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    const responseText = await slackResponse.text();
    const success = slackResponse.ok && responseText === 'ok';

    // Log alert
    await supabase.from('slack_alert_history').insert({
      category: payload.category,
      severity: payload.severity || 'info',
      title: payload.title,
      message_preview: payload.summary.substring(0, 200),
      delivery_status: success ? 'delivered' : 'failed',
      error_message: success ? null : `HTTP ${slackResponse.status}: ${responseText}`,
      dedup_key: payload.dedup_key,
      delivered_at: success ? new Date().toISOString() : null,
    });

    // Update config timestamps
    if (success) {
      await supabase
        .from('slack_integration_config')
        .update({ last_success_at: new Date().toISOString() })
        .eq('id', config.id);
    } else {
      await supabase
        .from('slack_integration_config')
        .update({ 
          last_failure_at: new Date().toISOString(),
          last_failure_reason: `HTTP ${slackResponse.status}: ${responseText}`,
        })
        .eq('id', config.id);
    }

    return new Response(JSON.stringify({ sent: success }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending Slack alert:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
