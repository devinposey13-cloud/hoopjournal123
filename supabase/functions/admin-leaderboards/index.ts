import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify token and check admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const metric = url.searchParams.get("metric") || "xp_total";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const searchQuery = url.searchParams.get("search") || "";
    const planFilter = url.searchParams.get("plan") || "";
    const minGames = parseInt(url.searchParams.get("min_games") || "0");

    // Get all player profiles with their data
    let profileQuery = supabaseAdmin
      .from("player_settings")
      .select("id, user_id, name, display_name, team, position, number, grade, created_at, username, avatar_url");

    if (searchQuery) {
      profileQuery = profileQuery.or(
        `name.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,team.ilike.%${searchQuery}%`
      );
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ leaderboard: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = profiles.map((p) => p.user_id);

    // Get plan overrides for all users
    const { data: planOverrides } = await supabaseAdmin
      .from("plan_overrides")
      .select("user_id, subscription_plan, is_grandfathered, admin_override_plan, promo_locked_in, promo_type");

    const planMap = new Map<string, any>();
    (planOverrides || []).forEach((po) => planMap.set(po.user_id, po));

    // Get email from approval requests
    const { data: approvals } = await supabaseAdmin
      .from("account_approval_requests")
      .select("user_id, email");
    const emailMap = new Map<string, string>();
    (approvals || []).forEach((a) => {
      if (a.email) emailMap.set(a.user_id, a.email);
    });

    // Calculate effective plan for each user
    function getEffectivePlan(userId: string): string {
      const po = planMap.get(userId);
      if (!po) return "free";
      if (po.is_grandfathered) return "elite";
      if (po.admin_override_plan) return po.admin_override_plan;
      if (po.promo_locked_in && po.promo_type === "AAU_MARCH_2026_ELITE_LOCK" && po.subscription_plan === "starter") return "elite";
      return po.subscription_plan || "free";
    }

    // Filter by plan
    let filteredUserIds = userIds;
    if (planFilter) {
      filteredUserIds = userIds.filter((uid) => getEffectivePlan(uid) === planFilter);
    }

    if (filteredUserIds.length === 0) {
      return new Response(
        JSON.stringify({ leaderboard: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch metric-specific data
    let leaderboardEntries: Array<{
      user_id: string;
      profile_name: string;
      display_name: string | null;
      team: string;
      position: string;
      email: string | null;
      effective_plan: string;
      metric_value: number;
      games_logged: number;
      last_active: string | null;
      avatar_url: string | null;
    }> = [];

    // Get all games for these users
    const { data: allGames } = await supabaseAdmin
      .from("games")
      .select("user_id, date, points, rebounds, assists, steals, blocks, turnovers, minutes_played, is_win, created_at")
      .in("user_id", filteredUserIds)
      .order("date", { ascending: false });

    const gamesByUser = new Map<string, typeof allGames>();
    (allGames || []).forEach((g) => {
      const arr = gamesByUser.get(g.user_id) || [];
      arr.push(g);
      gamesByUser.set(g.user_id, arr);
    });

    // Get XP data
    const { data: xpData } = await supabaseAdmin
      .from("player_xp_progress")
      .select("user_id, current_xp, current_level, games_logged, updated_at")
      .in("user_id", filteredUserIds)
      .order("updated_at", { ascending: false });

    const xpByUser = new Map<string, any>();
    (xpData || []).forEach((x) => {
      if (!xpByUser.has(x.user_id)) xpByUser.set(x.user_id, x);
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.user_id, p));

    for (const userId of filteredUserIds) {
      const profile = profileMap.get(userId);
      if (!profile) continue;

      const userGames = gamesByUser.get(userId) || [];
      const xp = xpByUser.get(userId);
      const totalGames = userGames.length;

      if (minGames > 0 && totalGames < minGames) continue;

      let metricValue = 0;

      switch (metric) {
        case "xp_total":
          metricValue = xp?.current_xp || 0;
          break;

        case "games_all":
          metricValue = totalGames;
          break;

        case "games_30d": {
          metricValue = userGames.filter((g) => g.date >= thirtyDaysAgo).length;
          break;
        }

        case "avg_points_10": {
          const last10 = userGames.slice(0, 10);
          if (last10.length > 0) {
            metricValue = parseFloat((last10.reduce((sum, g) => sum + g.points, 0) / last10.length).toFixed(1));
          }
          break;
        }

        case "avg_assists_10": {
          const last10 = userGames.slice(0, 10);
          if (last10.length > 0) {
            metricValue = parseFloat((last10.reduce((sum, g) => sum + g.assists, 0) / last10.length).toFixed(1));
          }
          break;
        }

        case "avg_rebounds_10": {
          const last10 = userGames.slice(0, 10);
          if (last10.length > 0) {
            metricValue = parseFloat((last10.reduce((sum, g) => sum + g.rebounds, 0) / last10.length).toFixed(1));
          }
          break;
        }

        case "win_pct_10": {
          const last10 = userGames.slice(0, 10);
          if (last10.length > 0) {
            const wins = last10.filter((g) => g.is_win).length;
            metricValue = parseFloat(((wins / last10.length) * 100).toFixed(1));
          }
          break;
        }

        case "current_level":
          metricValue = xp?.current_level || 1;
          break;

        default:
          metricValue = 0;
      }

      const lastGame = userGames[0];

      leaderboardEntries.push({
        user_id: userId,
        profile_name: profile.name,
        display_name: profile.display_name,
        team: profile.team,
        position: profile.position,
        email: emailMap.get(userId) || null,
        effective_plan: getEffectivePlan(userId),
        metric_value: metricValue,
        games_logged: totalGames,
        last_active: lastGame?.date || profile.created_at,
        avatar_url: profile.avatar_url,
      });
    }

    // Sort by metric desc
    leaderboardEntries.sort((a, b) => b.metric_value - a.metric_value);

    const total = leaderboardEntries.length;
    const paged = leaderboardEntries.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({ leaderboard: paged, total, metric }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-leaderboards:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
