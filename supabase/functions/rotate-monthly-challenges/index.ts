import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month in format "YYYY-MM"
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get previous month
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Rotating challenges: deactivating ${previousMonth}, activating ${currentMonth}`);

    // Step 1: Deactivate previous month's challenges
    const { error: deactivateError } = await supabase
      .from('monthly_challenges')
      .update({ is_active: false })
      .eq('month', previousMonth);

    if (deactivateError) {
      console.error('Error deactivating previous challenges:', deactivateError);
    }

    // Step 2: Activate current month's challenges
    const { data: activated, error: activateError } = await supabase
      .from('monthly_challenges')
      .update({ is_active: true })
      .eq('month', currentMonth)
      .select();

    if (activateError) {
      console.error('Error activating current challenges:', activateError);
      throw activateError;
    }

    // Step 3: Clear progress for the new month's challenges (reset all users)
    if (activated && activated.length > 0) {
      const challengeIds = activated.map(c => c.id);
      
      const { error: clearError } = await supabase
        .from('challenge_progress')
        .delete()
        .in('challenge_id', challengeIds);

      if (clearError) {
        console.error('Error clearing progress:', clearError);
      }
    }

    const result = {
      success: true,
      deactivatedMonth: previousMonth,
      activatedMonth: currentMonth,
      activatedChallenges: activated?.length || 0,
      timestamp: now.toISOString(),
    };

    console.log('Challenge rotation complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in rotate-monthly-challenges:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
