export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_approval_requests: {
        Row: {
          admin_notes: string | null
          approval_method: string | null
          created_at: string
          email: string | null
          id: string
          notification_sent: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          username: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_method?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notification_sent?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          username?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_method?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notification_sent?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      admin_trial_reset_log: {
        Row: {
          additional_note: string | null
          admin_email: string | null
          admin_user_id: string
          created_at: string
          error_details: string | null
          id: string
          new_trial_eligible: boolean
          previous_trial_eligible: boolean
          reason_category: string
          reset_count_after: number
          reset_count_before: number
          success: boolean
          target_user_email: string | null
          target_user_id: string
        }
        Insert: {
          additional_note?: string | null
          admin_email?: string | null
          admin_user_id: string
          created_at?: string
          error_details?: string | null
          id?: string
          new_trial_eligible: boolean
          previous_trial_eligible: boolean
          reason_category: string
          reset_count_after: number
          reset_count_before: number
          success?: boolean
          target_user_email?: string | null
          target_user_id: string
        }
        Update: {
          additional_note?: string | null
          admin_email?: string | null
          admin_user_id?: string
          created_at?: string
          error_details?: string | null
          id?: string
          new_trial_eligible?: boolean
          previous_trial_eligible?: boolean
          reason_category?: string
          reset_count_after?: number
          reset_count_before?: number
          success?: boolean
          target_user_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      age_confirmations: {
        Row: {
          age_declared: string
          consent_timestamp: string | null
          created_at: string
          device_metadata: Json | null
          id: string
          ip_address: string | null
          parent_consent: boolean
          user_id: string
        }
        Insert: {
          age_declared: string
          consent_timestamp?: string | null
          created_at?: string
          device_metadata?: Json | null
          id?: string
          ip_address?: string | null
          parent_consent?: boolean
          user_id: string
        }
        Update: {
          age_declared?: string
          consent_timestamp?: string | null
          created_at?: string
          device_metadata?: Json | null
          id?: string
          ip_address?: string | null
          parent_consent?: boolean
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          bronze_threshold: Json
          category: string
          created_at: string
          description: string
          gold_threshold: Json
          hof_threshold: Json
          icon: string
          id: string
          name: string
          silver_threshold: Json
        }
        Insert: {
          bronze_threshold?: Json
          category: string
          created_at?: string
          description: string
          gold_threshold?: Json
          hof_threshold?: Json
          icon: string
          id?: string
          name: string
          silver_threshold?: Json
        }
        Update: {
          bronze_threshold?: Json
          category?: string
          created_at?: string
          description?: string
          gold_threshold?: Json
          hof_threshold?: Json
          icon?: string
          id?: string
          name?: string
          silver_threshold?: Json
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sent_by: string | null
          target_audience: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sent_by?: string | null
          target_audience?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sent_by?: string | null
          target_audience?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          is_completed: boolean
          profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_recovery_requests: {
        Row: {
          card_id: string
          created_at: string
          entered_email: string | null
          entered_jersey: number
          entered_name: string
          entered_team: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          entered_email?: string | null
          entered_jersey: number
          entered_name: string
          entered_team: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          entered_email?: string | null
          entered_jersey?: number
          entered_name?: string
          entered_team?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_recovery_requests_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "quick_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_memory: {
        Row: {
          confidence: number | null
          created_at: string
          expires_at: string | null
          id: string
          last_updated_at: string | null
          memory_key: string
          memory_type: string
          memory_value: string
          occurrence_count: number | null
          profile_id: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_updated_at?: string | null
          memory_key: string
          memory_type: string
          memory_value: string
          occurrence_count?: number | null
          profile_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_updated_at?: string | null
          memory_key?: string
          memory_type?: string
          memory_value?: string
          occurrence_count?: number | null
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_memory_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_memory_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conditioning_sessions: {
        Row: {
          activity_type: string
          average_accuracy: number | null
          created_at: string
          elapsed_seconds: number | null
          end_time: string | null
          gps_point_count: number | null
          gps_points: Json | null
          id: string
          is_manual: boolean
          max_speed: number | null
          notes: string | null
          pause_count: number | null
          profile_id: string | null
          session_date: string
          start_time: string | null
          total_distance_meters: number | null
          user_id: string
          verification_status: string
        }
        Insert: {
          activity_type?: string
          average_accuracy?: number | null
          created_at?: string
          elapsed_seconds?: number | null
          end_time?: string | null
          gps_point_count?: number | null
          gps_points?: Json | null
          id?: string
          is_manual?: boolean
          max_speed?: number | null
          notes?: string | null
          pause_count?: number | null
          profile_id?: string | null
          session_date?: string
          start_time?: string | null
          total_distance_meters?: number | null
          user_id: string
          verification_status?: string
        }
        Update: {
          activity_type?: string
          average_accuracy?: number | null
          created_at?: string
          elapsed_seconds?: number | null
          end_time?: string | null
          gps_point_count?: number | null
          gps_points?: Json | null
          id?: string
          is_manual?: boolean
          max_speed?: number | null
          notes?: string | null
          pause_count?: number | null
          profile_id?: string | null
          session_date?: string
          start_time?: string | null
          total_distance_meters?: number | null
          user_id?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditioning_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conditioning_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          ai_response: string
          created_at: string
          id: string
          reason: string | null
          reported_content: string
          reporter_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          ai_response: string
          created_at?: string
          id?: string
          reason?: string | null
          reported_content: string
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          ai_response?: string
          created_at?: string
          id?: string
          reason?: string | null
          reported_content?: string
          reporter_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_key: string
          flag_label: string
          flag_value: string | null
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_key: string
          flag_label: string
          flag_value?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_key?: string
          flag_label?: string
          flag_value?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game_type: string
          id: string
          metadata: Json | null
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          metadata?: Json | null
          played_at?: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          metadata?: Json | null
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          assists: number
          blocks: number
          created_at: string
          date: string
          fg_attempted: number
          fg_made: number
          final_score_them: number | null
          final_score_us: number | null
          fouls: number
          ft_attempted: number
          ft_made: number
          game_photo_url: string | null
          game_score: number | null
          halftime_score_them: number | null
          halftime_score_us: number | null
          id: string
          is_win: boolean
          minutes_played: number
          opponent: string
          points: number
          profile_id: string | null
          rebounds: number
          scheduled_game_id: string | null
          season_id: string | null
          steals: number
          team_id: string | null
          three_pt_attempted: number
          three_pt_made: number
          turnovers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assists?: number
          blocks?: number
          created_at?: string
          date: string
          fg_attempted?: number
          fg_made?: number
          final_score_them?: number | null
          final_score_us?: number | null
          fouls?: number
          ft_attempted?: number
          ft_made?: number
          game_photo_url?: string | null
          game_score?: number | null
          halftime_score_them?: number | null
          halftime_score_us?: number | null
          id?: string
          is_win?: boolean
          minutes_played?: number
          opponent: string
          points?: number
          profile_id?: string | null
          rebounds?: number
          scheduled_game_id?: string | null
          season_id?: string | null
          steals?: number
          team_id?: string | null
          three_pt_attempted?: number
          three_pt_made?: number
          turnovers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assists?: number
          blocks?: number
          created_at?: string
          date?: string
          fg_attempted?: number
          fg_made?: number
          final_score_them?: number | null
          final_score_us?: number | null
          fouls?: number
          ft_attempted?: number
          ft_made?: number
          game_photo_url?: string | null
          game_score?: number | null
          halftime_score_them?: number | null
          halftime_score_us?: number | null
          id?: string
          is_win?: boolean
          minutes_played?: number
          opponent?: string
          points?: number
          profile_id?: string | null
          rebounds?: number
          scheduled_game_id?: string | null
          season_id?: string | null
          steals?: number
          team_id?: string | null
          three_pt_attempted?: number
          three_pt_made?: number
          turnovers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_scheduled_game_id_fkey"
            columns: ["scheduled_game_id"]
            isOneToOne: false
            referencedRelation: "scheduled_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      level_rewards: {
        Row: {
          created_at: string
          description: string
          id: string
          level_required: number
          reward_icon: string
          reward_name: string
          reward_type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          level_required: number
          reward_icon: string
          reward_name: string
          reward_type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          level_required?: number
          reward_icon?: string
          reward_name?: string
          reward_type?: string
        }
        Relationships: []
      }
      milestone_definitions: {
        Row: {
          category: string
          check_type: string
          created_at: string
          description: string
          icon: string
          id: string
          is_repeatable: boolean
          name: string
          rarity: string
          secondary_threshold: number | null
          threshold: number
        }
        Insert: {
          category: string
          check_type: string
          created_at?: string
          description: string
          icon: string
          id?: string
          is_repeatable?: boolean
          name: string
          rarity: string
          secondary_threshold?: number | null
          threshold?: number
        }
        Update: {
          category?: string
          check_type?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_repeatable?: boolean
          name?: string
          rarity?: string
          secondary_threshold?: number | null
          threshold?: number
        }
        Relationships: []
      }
      monthly_challenges: {
        Row: {
          check_type: string
          created_at: string
          description: string
          difficulty: string
          icon: string
          id: string
          is_active: boolean
          month: string
          name: string
          reward_points: number
          secondary_threshold: number | null
          theme_name: string | null
          threshold: number
        }
        Insert: {
          check_type: string
          created_at?: string
          description: string
          difficulty?: string
          icon?: string
          id?: string
          is_active?: boolean
          month: string
          name: string
          reward_points?: number
          secondary_threshold?: number | null
          theme_name?: string | null
          threshold?: number
        }
        Update: {
          check_type?: string
          created_at?: string
          description?: string
          difficulty?: string
          icon?: string
          id?: string
          is_active?: boolean
          month?: string
          name?: string
          reward_points?: number
          secondary_threshold?: number | null
          theme_name?: string | null
          threshold?: number
        }
        Relationships: []
      }
      parent_dashboard_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_viewed_at: string | null
          profile_id: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          profile_id?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_viewed_at?: string | null
          profile_id?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_dashboard_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_dashboard_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          phone: string
          player_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          phone: string
          player_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          phone?: string
          player_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_overrides: {
        Row: {
          admin_override_plan: string | null
          created_at: string
          id: string
          is_grandfathered: boolean
          last_trial_reset_at: string | null
          last_trial_reset_by: string | null
          last_trial_reset_reason: string | null
          lifetime_games_logged: number
          lifetime_pdf_exports: number
          lifetime_report_cards_generated: number
          promo_access_until: string | null
          promo_eligible: boolean
          promo_locked_in: boolean
          promo_source: string | null
          promo_start_date: string | null
          promo_type: string | null
          subscription_plan: string
          trial_eligibility_reset_count: number
          trial_eligible: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          admin_override_plan?: string | null
          created_at?: string
          id?: string
          is_grandfathered?: boolean
          last_trial_reset_at?: string | null
          last_trial_reset_by?: string | null
          last_trial_reset_reason?: string | null
          lifetime_games_logged?: number
          lifetime_pdf_exports?: number
          lifetime_report_cards_generated?: number
          promo_access_until?: string | null
          promo_eligible?: boolean
          promo_locked_in?: boolean
          promo_source?: string | null
          promo_start_date?: string | null
          promo_type?: string | null
          subscription_plan?: string
          trial_eligibility_reset_count?: number
          trial_eligible?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          admin_override_plan?: string | null
          created_at?: string
          id?: string
          is_grandfathered?: boolean
          last_trial_reset_at?: string | null
          last_trial_reset_by?: string | null
          last_trial_reset_reason?: string | null
          lifetime_games_logged?: number
          lifetime_pdf_exports?: number
          lifetime_report_cards_generated?: number
          promo_access_until?: string | null
          promo_eligible?: boolean
          promo_locked_in?: boolean
          promo_source?: string | null
          promo_start_date?: string | null
          promo_type?: string | null
          subscription_plan?: string
          trial_eligibility_reset_count?: number
          trial_eligible?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      player_badges: {
        Row: {
          badge_category: string
          badge_name: string
          earned_at: string
          id: string
          profile_id: string | null
          season_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          badge_category: string
          badge_name: string
          earned_at?: string
          id?: string
          profile_id?: string | null
          season_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          badge_category?: string
          badge_name?: string
          earned_at?: string
          id?: string
          profile_id?: string | null
          season_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_badges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_level_rewards: {
        Row: {
          id: string
          reward_id: string
          unlocked_at: string
          unlocked_quarter: string
          user_id: string
        }
        Insert: {
          id?: string
          reward_id: string
          unlocked_at?: string
          unlocked_quarter: string
          user_id: string
        }
        Update: {
          id?: string
          reward_id?: string
          unlocked_at?: string
          unlocked_quarter?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_level_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "level_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      player_milestones: {
        Row: {
          earned_at: string
          game_id: string | null
          id: string
          is_viewed: boolean
          milestone_id: string
          profile_id: string | null
          season_id: string | null
          stats_snapshot: Json
          user_id: string
        }
        Insert: {
          earned_at?: string
          game_id?: string | null
          id?: string
          is_viewed?: boolean
          milestone_id: string
          profile_id?: string | null
          season_id?: string | null
          stats_snapshot?: Json
          user_id: string
        }
        Update: {
          earned_at?: string
          game_id?: string | null
          id?: string
          is_viewed?: boolean
          milestone_id?: string
          profile_id?: string | null
          season_id?: string | null
          stats_snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_milestones_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestone_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_milestones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_milestones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_milestones_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_settings: {
        Row: {
          avatar_skipped_at: string | null
          avatar_url: string | null
          coach_persona: string | null
          coach_voice_gender: string
          court_role: string | null
          created_at: string
          display_name: string | null
          grade: string
          height: string
          id: string
          instagram_url: string | null
          is_active_profile: boolean
          is_approved: boolean
          is_profile_public: boolean
          name: string
          number: number
          onboarding_completed_at: string | null
          parent_email: string | null
          phone: string | null
          playing_level: string | null
          position: string
          receive_game_summaries: boolean
          ring_of_honor_opt_in: boolean
          season_goals: string[] | null
          team: string
          theme_music_url: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_skipped_at?: string | null
          avatar_url?: string | null
          coach_persona?: string | null
          coach_voice_gender?: string
          court_role?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string
          height?: string
          id?: string
          instagram_url?: string | null
          is_active_profile?: boolean
          is_approved?: boolean
          is_profile_public?: boolean
          name?: string
          number?: number
          onboarding_completed_at?: string | null
          parent_email?: string | null
          phone?: string | null
          playing_level?: string | null
          position?: string
          receive_game_summaries?: boolean
          ring_of_honor_opt_in?: boolean
          season_goals?: string[] | null
          team?: string
          theme_music_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_skipped_at?: string | null
          avatar_url?: string | null
          coach_persona?: string | null
          coach_voice_gender?: string
          court_role?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string
          height?: string
          id?: string
          instagram_url?: string | null
          is_active_profile?: boolean
          is_approved?: boolean
          is_profile_public?: boolean
          name?: string
          number?: number
          onboarding_completed_at?: string | null
          parent_email?: string | null
          phone?: string | null
          playing_level?: string | null
          position?: string
          receive_game_summaries?: boolean
          ring_of_honor_opt_in?: boolean
          season_goals?: string[] | null
          team?: string
          theme_music_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      player_teams: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          name: string
          profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tier_achievements: {
        Row: {
          achieved_at: string
          game_id: string | null
          id: string
          performance_score: number
          profile_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          game_id?: string | null
          id?: string
          performance_score: number
          profile_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          game_id?: string | null
          id?: string
          performance_score?: number
          profile_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_tier_achievements_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tier_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tier_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_xp_history: {
        Row: {
          archived_at: string
          avg_performance: number | null
          final_level: number
          games_played: number
          id: string
          profile_id: string | null
          quarter: string
          total_xp_earned: number
          user_id: string
        }
        Insert: {
          archived_at?: string
          avg_performance?: number | null
          final_level: number
          games_played: number
          id?: string
          profile_id?: string | null
          quarter: string
          total_xp_earned: number
          user_id: string
        }
        Update: {
          archived_at?: string
          avg_performance?: number | null
          final_level?: number
          games_played?: number
          id?: string
          profile_id?: string | null
          quarter?: string
          total_xp_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_xp_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_xp_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_xp_progress: {
        Row: {
          created_at: string
          current_level: number
          current_xp: number
          games_logged: number
          id: string
          peak_level: number
          profile_id: string | null
          quarter: string
          total_performance_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_xp?: number
          games_logged?: number
          id?: string
          peak_level?: number
          profile_id?: string | null
          quarter: string
          total_performance_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_xp?: number
          games_logged?: number
          id?: string
          peak_level?: number
          profile_id?: string | null
          quarter?: string
          total_performance_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_xp_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_xp_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_views: {
        Row: {
          id: string
          policy_type: string
          policy_version: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          policy_type: string
          policy_version: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          policy_type?: string
          policy_version?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      postgame_insights: {
        Row: {
          areas_to_improve: string[] | null
          confidence_level: number | null
          created_at: string
          feeling: string | null
          game_id: string
          goals_achieved: string[] | null
          goals_missed: string[] | null
          id: string
          key_takeaways: string[] | null
          mental_notes: string | null
          profile_id: string | null
          season_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          areas_to_improve?: string[] | null
          confidence_level?: number | null
          created_at?: string
          feeling?: string | null
          game_id: string
          goals_achieved?: string[] | null
          goals_missed?: string[] | null
          id?: string
          key_takeaways?: string[] | null
          mental_notes?: string | null
          profile_id?: string | null
          season_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          areas_to_improve?: string[] | null
          confidence_level?: number | null
          created_at?: string
          feeling?: string | null
          game_id?: string
          goals_achieved?: string[] | null
          goals_missed?: string[] | null
          id?: string
          key_takeaways?: string[] | null
          mental_notes?: string | null
          profile_id?: string | null
          season_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postgame_insights_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postgame_insights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postgame_insights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postgame_insights_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ft_attempted: number
          ft_made: number
          id: string
          midrange_attempted: number
          midrange_made: number
          notes: string | null
          practice_type: string
          profile_id: string | null
          three_pt_attempted: number
          three_pt_made: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ft_attempted?: number
          ft_made?: number
          id?: string
          midrange_attempted?: number
          midrange_made?: number
          notes?: string | null
          practice_type?: string
          profile_id?: string | null
          three_pt_attempted?: number
          three_pt_made?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ft_attempted?: number
          ft_made?: number
          id?: string
          midrange_attempted?: number
          midrange_made?: number
          notes?: string | null
          practice_type?: string
          profile_id?: string | null
          three_pt_attempted?: number
          three_pt_made?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_cards: {
        Row: {
          badges: Json
          card_headline: string | null
          card_source: string
          claim_attempts: number
          claim_code: string | null
          claim_status: string
          claim_token: string | null
          claimed_by_user_id: string | null
          contact_info: string | null
          created_at: string
          created_by_admin_id: string
          eligible_for_career_stats: boolean
          eligible_for_leaderboards: boolean
          eligible_for_xp_progression: boolean
          expires_at: string | null
          grade: string
          id: string
          jersey_number: number
          last_claim_attempt_at: string | null
          photo_url: string | null
          player_name: string
          position: string | null
          print_count: number
          recovery_claim: boolean
          stats: Json
          team_name: string
          template_used: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          badges?: Json
          card_headline?: string | null
          card_source?: string
          claim_attempts?: number
          claim_code?: string | null
          claim_status?: string
          claim_token?: string | null
          claimed_by_user_id?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_admin_id: string
          eligible_for_career_stats?: boolean
          eligible_for_leaderboards?: boolean
          eligible_for_xp_progression?: boolean
          expires_at?: string | null
          grade: string
          id?: string
          jersey_number: number
          last_claim_attempt_at?: string | null
          photo_url?: string | null
          player_name: string
          position?: string | null
          print_count?: number
          recovery_claim?: boolean
          stats?: Json
          team_name: string
          template_used: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          badges?: Json
          card_headline?: string | null
          card_source?: string
          claim_attempts?: number
          claim_code?: string | null
          claim_status?: string
          claim_token?: string | null
          claimed_by_user_id?: string | null
          contact_info?: string | null
          created_at?: string
          created_by_admin_id?: string
          eligible_for_career_stats?: boolean
          eligible_for_leaderboards?: boolean
          eligible_for_xp_progression?: boolean
          expires_at?: string | null
          grade?: string
          id?: string
          jersey_number?: number
          last_claim_attempt_at?: string | null
          photo_url?: string | null
          player_name?: string
          position?: string | null
          print_count?: number
          recovery_claim?: boolean
          stats?: Json
          team_name?: string
          template_used?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      quick_mode_audit_log: {
        Row: {
          action: string
          admin_id: string
          card_id: string | null
          created_at: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_id: string
          card_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string
          card_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_mode_audit_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "quick_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          attempts: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          action: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          identifier?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      ring_of_honor: {
        Row: {
          achieved_at: string
          avatar_url: string | null
          created_at: string
          display_name: string
          final_xp: number
          games_played: number
          id: string
          inducted_at: string
          position: string | null
          quarter: string
          team_name: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          final_xp?: number
          games_played?: number
          id?: string
          inducted_at?: string
          position?: string | null
          quarter: string
          team_name?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          final_xp?: number
          games_played?: number
          id?: string
          inducted_at?: string
          position?: string | null
          quarter?: string
          team_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_games: {
        Row: {
          created_at: string
          date: string
          id: string
          is_home: boolean
          location: string
          notes: string | null
          opponent: string
          profile_id: string | null
          season_id: string | null
          team_id: string | null
          time: string
          tournament: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_home?: boolean
          location: string
          notes?: string | null
          opponent: string
          profile_id?: string | null
          season_id?: string | null
          team_id?: string | null
          time: string
          tournament?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_home?: boolean
          location?: string
          notes?: string | null
          opponent?: string
          profile_id?: string | null
          season_id?: string | null
          team_id?: string | null
          time?: string
          tournament?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_games_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_games_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          profile_id: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          profile_id?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          profile_id?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_alert_history: {
        Row: {
          category: string
          channel: string | null
          created_at: string
          dedup_key: string | null
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          message_preview: string | null
          retry_count: number
          severity: string
          title: string
        }
        Insert: {
          category: string
          channel?: string | null
          created_at?: string
          dedup_key?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          retry_count?: number
          severity?: string
          title: string
        }
        Update: {
          category?: string
          channel?: string | null
          created_at?: string
          dedup_key?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          retry_count?: number
          severity?: string
          title?: string
        }
        Relationships: []
      }
      slack_alert_preferences: {
        Row: {
          category: string
          channel_override: string | null
          created_at: string
          frequency: string
          id: string
          is_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          category: string
          channel_override?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          channel_override?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      slack_integration_config: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_failure_reason: string | null
          last_success_at: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_success_at?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_success_at?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
      stats_predictions: {
        Row: {
          accuracy_score: number | null
          actual_assists: number | null
          actual_points: number | null
          actual_rebounds: number | null
          created_at: string
          id: string
          is_resolved: boolean
          points_earned: number | null
          predicted_assists: number
          predicted_points: number
          predicted_rebounds: number
          profile_id: string | null
          resolved_at: string | null
          scheduled_game_id: string
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          actual_assists?: number | null
          actual_points?: number | null
          actual_rebounds?: number | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          points_earned?: number | null
          predicted_assists?: number
          predicted_points?: number
          predicted_rebounds?: number
          profile_id?: string | null
          resolved_at?: string | null
          scheduled_game_id: string
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          actual_assists?: number | null
          actual_points?: number | null
          actual_rebounds?: number | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          points_earned?: number | null
          predicted_assists?: number
          predicted_points?: number
          predicted_rebounds?: number
          profile_id?: string | null
          resolved_at?: string | null
          scheduled_game_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stats_predictions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stats_predictions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stats_predictions_scheduled_game_id_fkey"
            columns: ["scheduled_game_id"]
            isOneToOne: false
            referencedRelation: "scheduled_games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_game_stats: {
        Row: {
          current_streak: number | null
          free_throw_high_score: number | null
          games_played: number
          id: string
          last_played_at: string | null
          longest_streak: number | null
          memory_match_best_time: number | null
          prediction_accuracy: number | null
          predictions_made: number | null
          reaction_best_time: number | null
          total_points: number
          trivia_accuracy: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          free_throw_high_score?: number | null
          games_played?: number
          id?: string
          last_played_at?: string | null
          longest_streak?: number | null
          memory_match_best_time?: number | null
          prediction_accuracy?: number | null
          predictions_made?: number | null
          reaction_best_time?: number | null
          total_points?: number
          trivia_accuracy?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number | null
          free_throw_high_score?: number | null
          games_played?: number
          id?: string
          last_played_at?: string | null
          longest_streak?: number | null
          memory_match_best_time?: number | null
          prediction_accuracy?: number | null
          predictions_made?: number | null
          reaction_best_time?: number | null
          total_points?: number
          trivia_accuracy?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_clips: {
        Row: {
          created_at: string
          date: string
          description: string | null
          file_path: string
          game_id: string | null
          id: string
          is_public: boolean
          profile_id: string | null
          season_id: string | null
          thumbnail_path: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          file_path: string
          game_id?: string | null
          id?: string
          is_public?: boolean
          profile_id?: string | null
          season_id?: string | null
          thumbnail_path?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          file_path?: string
          game_id?: string | null
          id?: string
          is_public?: boolean
          profile_id?: string | null
          season_id?: string | null
          thumbnail_path?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_clips_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_clips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "player_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_clips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_player_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_clips_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_clips"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_clips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_player_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          grade: string | null
          height: string | null
          id: string | null
          instagram_url: string | null
          is_profile_public: boolean | null
          name: string | null
          number: number | null
          position: string | null
          team: string | null
          theme_music_url: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: never
          grade?: string | null
          height?: string | null
          id?: string | null
          instagram_url?: never
          is_profile_public?: boolean | null
          name?: never
          number?: number | null
          position?: string | null
          team?: string | null
          theme_music_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: never
          grade?: string | null
          height?: string | null
          id?: string | null
          instagram_url?: never
          is_profile_public?: boolean | null
          name?: never
          number?: number | null
          position?: string | null
          team?: string | null
          theme_music_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action: string
          p_block_seconds?: number
          p_identifier: string
          p_max_attempts?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      get_parent_dashboard_data: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plan_overrides_sensitive_unchanged: {
        Args: {
          _new_admin_override_plan: string
          _new_subscription_plan: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
