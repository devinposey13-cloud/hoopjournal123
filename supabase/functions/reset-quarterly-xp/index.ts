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

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    // Determine which quarter just ended and the new quarter
    let endedQuarter: string;
    let newQuarter: string;
    
    if (month === 0) { // January - Q4 ended, Q1 starting
      endedQuarter = `${year - 1}-Q4`;
      newQuarter = `${year}-Q1`;
    } else if (month === 3) { // April - Q1 ended, Q2 starting
      endedQuarter = `${year}-Q1`;
      newQuarter = `${year}-Q2`;
    } else if (month === 6) { // July - Q2 ended, Q3 starting
      endedQuarter = `${year}-Q2`;
      newQuarter = `${year}-Q3`;
    } else if (month === 9) { // October - Q3 ended, Q4 starting
      endedQuarter = `${year}-Q3`;
      newQuarter = `${year}-Q4`;
    } else {
      // Not a quarter boundary - this shouldn't happen with proper cron scheduling
      console.log('Not a quarter boundary, skipping reset');
      return new Response(
        JSON.stringify({ success: false, message: 'Not a quarter boundary' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Quarterly XP Reset: Archiving ${endedQuarter}, starting ${newQuarter}`);

    // Step 1: Get all XP progress records from the ended quarter
    const { data: progressRecords, error: fetchError } = await supabase
      .from('player_xp_progress')
      .select('*')
      .eq('quarter', endedQuarter);

    if (fetchError) {
      console.error('Error fetching XP progress:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${progressRecords?.length || 0} records to archive`);

    // Step 2: Archive each record to player_xp_history
    if (progressRecords && progressRecords.length > 0) {
      const historyRecords = progressRecords.map((record) => ({
        user_id: record.user_id,
        quarter: record.quarter,
        final_level: record.current_level,
        total_xp_earned: record.current_xp,
        games_played: record.games_logged,
        avg_performance: record.games_logged > 0 
          ? Number(record.total_performance_score) / record.games_logged 
          : null,
        archived_at: now.toISOString(),
      }));

      const { error: archiveError } = await supabase
        .from('player_xp_history')
        .insert(historyRecords);

      if (archiveError) {
        console.error('Error archiving XP history:', archiveError);
        throw archiveError;
      }

      console.log(`Archived ${historyRecords.length} records to history`);
    }

    // Step 3: Create fresh progress records for the new quarter
    // Get all unique user_ids from the ended quarter
    if (progressRecords && progressRecords.length > 0) {
      const newProgressRecords = progressRecords.map((record) => ({
        user_id: record.user_id,
        quarter: newQuarter,
        current_xp: 0,
        current_level: 1,
        peak_level: 1,
        games_logged: 0,
        total_performance_score: 0,
      }));

      const { error: insertError } = await supabase
        .from('player_xp_progress')
        .upsert(newProgressRecords, { onConflict: 'user_id,quarter' });

      if (insertError) {
        console.error('Error creating new quarter records:', insertError);
        throw insertError;
      }

      console.log(`Created ${newProgressRecords.length} new quarter records for ${newQuarter}`);
    }

    const result = {
      success: true,
      archivedQuarter: endedQuarter,
      newQuarter: newQuarter,
      recordsProcessed: progressRecords?.length || 0,
      timestamp: now.toISOString(),
    };

    console.log('Quarterly XP reset complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in reset-quarterly-xp:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
