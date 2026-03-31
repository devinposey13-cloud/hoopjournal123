import type { PlayerProfile } from './basketball';

export interface PlayerProfileRecord {
  id: string;
  user_id: string;
  name: string;
  team: string;
  position: string;
  number: number;
  height: string;
  grade: string;
  class_year?: number | null;
  avatar_url?: string;
  username?: string;
  display_name?: string;
  is_profile_public: boolean;
  theme_music_url?: string;
  instagram_url?: string;
  avatar_skipped_at?: string;
  court_role?: string;
  playing_level?: string;
  season_goals?: string[];
  parent_email?: string;
  onboarding_completed_at?: string;
  receive_game_summaries: boolean;
  coach_persona?: string;
  coach_voice_gender: 'male' | 'female';
  ring_of_honor_opt_in: boolean;
  is_active_profile: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileSummary {
  id: string;
  name: string;
  display_name?: string;
  number: number;
  avatar_url?: string;
  team: string;
  position: string;
  is_active_profile: boolean;
  onboarding_completed_at?: string;
}

export function mapRecordToPlayerProfile(record: PlayerProfileRecord): PlayerProfile {
  return {
    name: record.name,
    team: record.team,
    position: record.position,
    number: record.number,
    height: record.height,
    grade: record.grade,
    avatar: record.avatar_url,
    username: record.username,
    displayName: record.display_name,
    isProfilePublic: record.is_profile_public,
    themeMusicUrl: record.theme_music_url,
    instagramUrl: record.instagram_url,
    avatarSkippedAt: record.avatar_skipped_at,
    courtRole: record.court_role,
    playingLevel: record.playing_level,
    seasonGoals: record.season_goals,
    parentEmail: record.parent_email,
    onboardingCompletedAt: record.onboarding_completed_at,
    receiveGameSummaries: record.receive_game_summaries,
    coachPersona: record.coach_persona,
    coachVoiceGender: record.coach_voice_gender,
    ringOfHonorOptIn: record.ring_of_honor_opt_in,
  };
}
