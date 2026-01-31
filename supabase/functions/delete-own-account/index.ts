import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token to verify the requesting user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the JWT and get the user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token - no user ID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${userId} is deleting their own account`);

    // Create admin client with service role key for deletion
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user exists in auth.users
    const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(userId);
    if (targetUserError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "User not found in auth system" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting user: ${targetUser.user.email} (${userId})`);

    // Get all video clips to delete from storage
    const { data: videoClips } = await adminClient
      .from('video_clips')
      .select('file_path, thumbnail_path')
      .eq('user_id', userId);

    // Get player settings to delete avatar from storage
    const { data: playerSettings } = await adminClient
      .from('player_settings')
      .select('avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    // Delete video files from storage
    if (videoClips && videoClips.length > 0) {
      const filePaths = videoClips
        .flatMap(clip => [clip.file_path, clip.thumbnail_path])
        .filter(Boolean) as string[];
      
      if (filePaths.length > 0) {
        const { error: storageError } = await adminClient.storage
          .from('video-clips')
          .remove(filePaths);
        if (storageError) {
          console.error('Error deleting video clips from storage:', storageError);
        }
      }
    }

    // Delete avatar from storage
    if (playerSettings?.avatar_url && playerSettings.avatar_url.includes('avatars/')) {
      const pathMatch = playerSettings.avatar_url.match(/avatars\/(.+)$/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        const { error: avatarError } = await adminClient.storage
          .from('avatars')
          .remove([filePath]);
        if (avatarError) {
          console.error('Error deleting avatar from storage:', avatarError);
        }
      }
    }

    // Delete all user data from application tables
    // Delete in order to respect foreign key constraints
    const tablesToClean = [
      'video_likes',
      'video_comments',
      'video_clips',
      'stats_predictions',
      'postgame_insights',
      'player_milestones',
      'player_badges',
      'user_achievements',
      'user_game_stats',
      'game_scores',
      'games',
      'scheduled_games',
      'seasons',
      'user_feedback',
      'password_reset_requests',
      'content_reports',
      'account_approval_requests',
      'player_settings',
    ];

    for (const table of tablesToClean) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }

    // Also clean up reporter_user_id references in content_reports
    await adminClient
      .from('content_reports')
      .delete()
      .eq('reporter_user_id', userId);

    // Delete user roles
    await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Finally, delete the user from auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in delete-own-account:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
