import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { ProfileSummary, PlayerProfileRecord, mapRecordToPlayerProfile } from '@/types/profile';
import { toast } from 'sonner';

interface ActiveProfileContextValue {
  // Current active profile
  activeProfile: ProfileSummary | null;
  activeProfileId: string | null;
  
  // All profiles for this account
  profiles: ProfileSummary[];
  
  // Profile management
  switchProfile: (profileId: string) => Promise<void>;
  createProfile: () => Promise<string | null>; // Returns new profile ID
  deleteProfile: (profileId: string) => Promise<boolean>;
  
  // State
  loading: boolean;
  hasMultipleProfiles: boolean;
  
  // Force refresh
  refetchProfiles: () => Promise<void>;
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | undefined>(undefined);

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error('useActiveProfile must be used within an ActiveProfileProvider');
  }
  return context;
}

export function useActiveProfileProvider() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [activeProfile, setActiveProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all profiles for this user
  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('player_settings')
        .select('id, name, avatar_url, team, position, is_active_profile, onboarding_completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedProfiles: ProfileSummary[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url || undefined,
        team: p.team,
        position: p.position,
        is_active_profile: p.is_active_profile,
        onboarding_completed_at: p.onboarding_completed_at || undefined,
      }));

      setProfiles(mappedProfiles);

      // Set active profile
      const active = mappedProfiles.find(p => p.is_active_profile) || mappedProfiles[0] || null;
      setActiveProfile(active);

      // If there's a profile but none marked active, mark the first one as active
      if (mappedProfiles.length > 0 && !mappedProfiles.some(p => p.is_active_profile)) {
        await supabase
          .from('player_settings')
          .update({ is_active_profile: true })
          .eq('id', mappedProfiles[0].id);
        
        setActiveProfile({ ...mappedProfiles[0], is_active_profile: true });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Switch to a different profile
  const switchProfile = useCallback(async (profileId: string) => {
    if (!user) return;

    try {
      // Deactivate all profiles for this user
      await supabase
        .from('player_settings')
        .update({ is_active_profile: false })
        .eq('user_id', user.id);

      // Activate the selected profile
      await supabase
        .from('player_settings')
        .update({ is_active_profile: true })
        .eq('id', profileId);

      // Update local state
      const newActive = profiles.find(p => p.id === profileId);
      if (newActive) {
        setProfiles(prev => prev.map(p => ({
          ...p,
          is_active_profile: p.id === profileId,
        })));
        setActiveProfile({ ...newActive, is_active_profile: true });
        toast.success(`Switched to ${newActive.name}'s profile`);
      }
    } catch (error) {
      console.error('Error switching profile:', error);
      toast.error('Failed to switch profile');
    }
  }, [user, profiles]);

  // Create a new profile (returns the new profile ID for onboarding)
  const createProfile = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      // Deactivate all current profiles
      await supabase
        .from('player_settings')
        .update({ is_active_profile: false })
        .eq('user_id', user.id);

      // Create new profile with minimal defaults - onboarding will fill in the rest
      const { data, error } = await supabase
        .from('player_settings')
        .insert({
          user_id: user.id,
          name: 'New Player',
          team: 'Team Name',
          position: 'Guard',
          number: 0,
          height: "5'8\"",
          grade: '1st Grade',
          is_active_profile: true,
          is_approved: true, // Auto-approve additional profiles
          onboarding_completed_at: null, // Needs onboarding
        })
        .select('id, name, avatar_url, team, position, is_active_profile, onboarding_completed_at')
        .single();

      if (error) throw error;

      const newProfile: ProfileSummary = {
        id: data.id,
        name: data.name,
        avatar_url: data.avatar_url || undefined,
        team: data.team,
        position: data.position,
        is_active_profile: true,
        onboarding_completed_at: undefined,
      };

      // Update local state
      setProfiles(prev => [...prev.map(p => ({ ...p, is_active_profile: false })), newProfile]);
      setActiveProfile(newProfile);

      return data.id;
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
      return null;
    }
  }, [user]);

  // Delete a profile
  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (!user) return false;

    // Prevent deleting the last profile
    if (profiles.length <= 1) {
      toast.error('Cannot delete your only profile');
      return false;
    }

    try {
      const profileToDelete = profiles.find(p => p.id === profileId);
      if (!profileToDelete) return false;

      // Delete the profile (cascade will handle related data via foreign keys)
      const { error } = await supabase
        .from('player_settings')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      // Update local state
      const remainingProfiles = profiles.filter(p => p.id !== profileId);
      setProfiles(remainingProfiles);

      // If we deleted the active profile, switch to another
      if (activeProfile?.id === profileId && remainingProfiles.length > 0) {
        await switchProfile(remainingProfiles[0].id);
      }

      toast.success(`Profile "${profileToDelete.name}" deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Failed to delete profile');
      return false;
    }
  }, [user, profiles, activeProfile, switchProfile]);

  return {
    activeProfile,
    activeProfileId: activeProfile?.id || null,
    profiles,
    switchProfile,
    createProfile,
    deleteProfile,
    loading,
    hasMultipleProfiles: profiles.length > 1,
    refetchProfiles: fetchProfiles,
  };
}

export { ActiveProfileContext };
export type { ActiveProfileContextValue };
