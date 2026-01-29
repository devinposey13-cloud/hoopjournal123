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
          ft_attempted: number
          ft_made: number
          game_photo_url: string | null
          id: string
          is_win: boolean
          minutes_played: number
          opponent: string
          points: number
          rebounds: number
          season_id: string | null
          steals: number
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
          ft_attempted?: number
          ft_made?: number
          game_photo_url?: string | null
          id?: string
          is_win?: boolean
          minutes_played?: number
          opponent: string
          points?: number
          rebounds?: number
          season_id?: string | null
          steals?: number
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
          ft_attempted?: number
          ft_made?: number
          game_photo_url?: string | null
          id?: string
          is_win?: boolean
          minutes_played?: number
          opponent?: string
          points?: number
          rebounds?: number
          season_id?: string | null
          steals?: number
          three_pt_attempted?: number
          three_pt_made?: number
          turnovers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
      player_badges: {
        Row: {
          badge_category: string
          badge_name: string
          earned_at: string
          id: string
          season_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          badge_category: string
          badge_name: string
          earned_at?: string
          id?: string
          season_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          badge_category?: string
          badge_name?: string
          earned_at?: string
          id?: string
          season_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
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
          avatar_url: string | null
          created_at: string
          display_name: string | null
          grade: string
          height: string
          id: string
          instagram_url: string | null
          is_profile_public: boolean
          name: string
          number: number
          phone: string | null
          position: string
          team: string
          theme_music_url: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string
          height?: string
          id?: string
          instagram_url?: string | null
          is_profile_public?: boolean
          name?: string
          number?: number
          phone?: string | null
          position?: string
          team?: string
          theme_music_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string
          height?: string
          id?: string
          instagram_url?: string | null
          is_profile_public?: boolean
          name?: string
          number?: number
          phone?: string | null
          position?: string
          team?: string
          theme_music_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
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
          season_id: string | null
          time: string
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
          season_id?: string | null
          time: string
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
          season_id?: string | null
          time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
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
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          user_id?: string
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
          resolved_at?: string | null
          scheduled_game_id?: string
          user_id?: string
        }
        Relationships: [
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
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
