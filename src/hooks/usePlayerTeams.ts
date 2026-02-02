import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveProfile } from './useActiveProfile';
import { toast } from 'sonner';

export interface PlayerTeam {
  id: string;
  user_id: string;
  name: string;
  is_primary: boolean;
  created_at: string;
  profile_id: string | null;
}

export function usePlayerTeams() {
  const { user } = useAuth();
  const { activeProfileId, loading: profileLoading } = useActiveProfile();
  const [teams, setTeams] = useState<PlayerTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    // If no user or profile is still loading, don't fetch yet but keep loading state appropriately
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    // Wait for profile context to be ready before fetching
    if (profileLoading) {
      // Don't set loading to false yet - we're still waiting
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('player_teams')
        .select('*')
        .eq('user_id', user.id);

      // Scope to active profile if available, also include legacy data (null profile_id)
      if (activeProfileId) {
        query = query.or(`profile_id.eq.${activeProfileId},profile_id.is.null`);
      }

      const { data, error } = await query
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user, activeProfileId, profileLoading]);

  const addTeam = async (name: string, isPrimary: boolean = false) => {
    if (!user) return null;

    try {
      // If setting as primary, unset other primary teams first (scoped to profile)
      if (isPrimary) {
        let updateQuery = supabase
          .from('player_teams')
          .update({ is_primary: false })
          .eq('user_id', user.id);
        
        if (activeProfileId) {
          updateQuery = updateQuery.eq('profile_id', activeProfileId);
        }
        await updateQuery;
      }

      const { data, error } = await supabase
        .from('player_teams')
        .insert({
          user_id: user.id,
          profile_id: activeProfileId,
          name: name.trim(),
          is_primary: isPrimary || teams.length === 0, // First team is always primary
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTeams();
      toast.success('Team added!');
      return data;
    } catch (error) {
      console.error('Error adding team:', error);
      toast.error('Failed to add team');
      return null;
    }
  };

  const updateTeam = async (id: string, updates: Partial<Pick<PlayerTeam, 'name' | 'is_primary'>>) => {
    if (!user) return false;

    try {
      // If setting as primary, unset other primary teams first (scoped to profile)
      if (updates.is_primary) {
        let updateQuery = supabase
          .from('player_teams')
          .update({ is_primary: false })
          .eq('user_id', user.id);
        
        if (activeProfileId) {
          updateQuery = updateQuery.eq('profile_id', activeProfileId);
        }
        await updateQuery;
      }

      const { error } = await supabase
        .from('player_teams')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchTeams();
      toast.success('Team updated!');
      return true;
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
      return false;
    }
  };

  const deleteTeam = async (id: string) => {
    if (!user) return false;

    try {
      const teamToDelete = teams.find(t => t.id === id);
      const remainingTeams = teams.filter(t => t.id !== id);
      
      // Determine what to set for games/scheduled_games that had this team
      // If there's exactly one remaining team, assign it; otherwise set to null
      const newTeamId = remainingTeams.length === 1 ? remainingTeams[0].id : null;

      // Update all games that had this team
      await supabase
        .from('games')
        .update({ team_id: newTeamId })
        .eq('team_id', id)
        .eq('user_id', user.id);

      // Update all scheduled_games that had this team
      await supabase
        .from('scheduled_games')
        .update({ team_id: newTeamId })
        .eq('team_id', id)
        .eq('user_id', user.id);

      // If only one team remains, also auto-assign any previously unassigned games/scheduled games
      // to the remaining team so users don't see "No team assigned" anymore.
      if (newTeamId) {
        await supabase
          .from('games')
          .update({ team_id: newTeamId })
          .is('team_id', null)
          .eq('user_id', user.id);

        await supabase
          .from('scheduled_games')
          .update({ team_id: newTeamId })
          .is('team_id', null)
          .eq('user_id', user.id);
      }

      // Delete the team
      const { error } = await supabase
        .from('player_teams')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // If we deleted the primary team, set another as primary
      if (teamToDelete?.is_primary && remainingTeams.length > 0) {
        await supabase
          .from('player_teams')
          .update({ is_primary: true })
          .eq('id', remainingTeams[0].id);
      }
      
      await fetchTeams();
      toast.success('Team removed!');
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to remove team');
      return false;
    }
  };

  const setPrimaryTeam = async (id: string) => {
    return updateTeam(id, { is_primary: true });
  };

  const primaryTeam = teams.find(t => t.is_primary) || teams[0];

  return {
    teams,
    loading,
    primaryTeam,
    addTeam,
    updateTeam,
    deleteTeam,
    setPrimaryTeam,
    refetch: fetchTeams,
  };
}
