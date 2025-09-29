import { createClient } from '@/lib/supabase/client';
import type { Team } from '@/lib/types/database';

const supabase = createClient();

export const teamQueries = {
  // Get teams by coach
  getByCoach: async (coachId: string): Promise<Team[]> => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        ),
        athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          is_active
        )
      `)
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching teams by coach:', error);
      return [];
    }

    return data || [];
  },

  // Get team by ID with athletes
  getById: async (id: string): Promise<Team | null> => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        ),
        athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          date_of_birth,
          is_active
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching team by ID:', error);
      return null;
    }

    return data;
  },

  // Create team
  create: async (teamData: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team | null> => {
    const { data, error } = await supabase
      .from('teams')
      .insert(teamData)
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return null;
    }

    return data;
  },

  // Update team
  update: async (id: string, updates: Partial<Team>): Promise<Team | null> => {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error updating team:', error);
      return null;
    }

    return data;
  },

  // Search teams
  search: async (query: string, coachId?: string): Promise<Team[]> => {
    let queryBuilder = supabase
      .from('teams')
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .or(`name.ilike.%${query}%,organization.ilike.%${query}%`)
      .eq('is_active', true)
      .order('name')
      .limit(20);

    if (coachId) {
      queryBuilder = queryBuilder.eq('coach_id', coachId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching teams:', error);
      return [];
    }

    return data || [];
  },

  // Get teams with registrations in tournament
  getByTournament: async (tournamentId: string): Promise<Team[]> => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .in('id', 
        supabase
          .from('tournament_registrations')
          .select('team_id')
          .eq('tournament_id', tournamentId)
          .not('team_id', 'is', null)
      )
      .order('name');

    if (error) {
      console.error('Error fetching teams by tournament:', error);
      return [];
    }

    return data || [];
  },

  // Get team statistics
  getStats: async (teamId: string): Promise<{
    athleteCount: number;
    activeAthletes: number;
    tournamentRegistrations: number;
  }> => {
    // Get athlete counts
    const { count: athleteCount } = await supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    const { count: activeAthletes } = await supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true);

    // Get tournament registration count
    const { count: tournamentRegistrations } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    return {
      athleteCount: athleteCount || 0,
      activeAthletes: activeAthletes || 0,
      tournamentRegistrations: tournamentRegistrations || 0
    };
  },

  // Deactivate team
  deactivate: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('teams')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating team:', error);
      return false;
    }

    return true;
  },

  // Delete team (only if no athletes or registrations)
  delete: async (id: string): Promise<boolean> => {
    // Check if team has athletes
    const { count: athleteCount } = await supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', id);

    if (athleteCount && athleteCount > 0) {
      console.error('Cannot delete team with athletes');
      return false;
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting team:', error);
      return false;
    }

    return true;
  }
};
