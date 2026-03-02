
CREATE OR REPLACE FUNCTION public.get_parent_dashboard_data(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_row parent_dashboard_tokens%ROWTYPE;
  v_profile player_settings%ROWTYPE;
  v_games jsonb;
  v_milestones jsonb;
  v_xp jsonb;
  v_upcoming jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_token_row
  FROM parent_dashboard_tokens
  WHERE token = p_token AND is_active = true;

  IF v_token_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  UPDATE parent_dashboard_tokens SET last_viewed_at = now() WHERE id = v_token_row.id;

  SELECT * INTO v_profile
  FROM player_settings
  WHERE (v_token_row.profile_id IS NOT NULL AND id = v_token_row.profile_id)
     OR (v_token_row.profile_id IS NULL AND user_id = v_token_row.user_id AND is_active_profile = true)
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('error', 'profile_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY g.date DESC), '[]'::jsonb) INTO v_games
  FROM (
    SELECT id, date, opponent, points, rebounds, assists, steals, blocks, turnovers, fouls,
           minutes_played, fg_made, fg_attempted, three_pt_made, three_pt_attempted,
           ft_made, ft_attempted, is_win, final_score_us, final_score_them, team_id
    FROM games
    WHERE user_id = v_token_row.user_id
      AND (v_token_row.profile_id IS NULL OR profile_id = v_token_row.profile_id)
    ORDER BY date DESC
    LIMIT 20
  ) g;

  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_milestones
  FROM (
    SELECT pm.id, pm.earned_at, pm.stats_snapshot,
           md.name, md.description, md.icon, md.category, md.rarity
    FROM player_milestones pm
    JOIN milestone_definitions md ON md.id = pm.milestone_id
    WHERE pm.user_id = v_token_row.user_id
      AND (v_token_row.profile_id IS NULL OR pm.profile_id = v_token_row.profile_id)
    ORDER BY pm.earned_at DESC
    LIMIT 50
  ) m;

  SELECT COALESCE(to_jsonb(x), '{}'::jsonb) INTO v_xp
  FROM (
    SELECT current_xp, current_level, peak_level, games_logged, quarter
    FROM player_xp_progress
    WHERE user_id = v_token_row.user_id
      AND (v_token_row.profile_id IS NULL OR profile_id = v_token_row.profile_id)
    ORDER BY updated_at DESC
    LIMIT 1
  ) x;

  -- Upcoming scheduled games
  SELECT COALESCE(jsonb_agg(sg ORDER BY sg.date ASC), '[]'::jsonb) INTO v_upcoming
  FROM (
    SELECT id, date, time, opponent, location, is_home, tournament
    FROM scheduled_games
    WHERE user_id = v_token_row.user_id
      AND (v_token_row.profile_id IS NULL OR profile_id = v_token_row.profile_id)
      AND date >= now()
    ORDER BY date ASC
    LIMIT 10
  ) sg;

  v_result := jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'name', COALESCE(v_profile.display_name, v_profile.name),
      'team', v_profile.team,
      'position', v_profile.position,
      'number', v_profile.number,
      'height', v_profile.height,
      'grade', v_profile.grade,
      'avatar_url', v_profile.avatar_url
    ),
    'games', v_games,
    'milestones', v_milestones,
    'xp', v_xp,
    'upcoming_games', v_upcoming
  );

  RETURN v_result;
END;
$$;
