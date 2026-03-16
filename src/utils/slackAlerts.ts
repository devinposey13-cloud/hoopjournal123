import { supabase } from '@/integrations/supabase/client';

interface SlackAlertPayload {
  category: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  details?: Record<string, string>;
  cta_url?: string;
  cta_label?: string;
  dedup_key?: string;
}

/**
 * Dispatches a Slack alert via the send-slack-alert edge function.
 * Fire-and-forget — errors are logged but don't throw.
 */
export async function dispatchSlackAlert(payload: SlackAlertPayload): Promise<void> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-slack-alert`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.error('Slack alert dispatch failed:', err);
  }
}
