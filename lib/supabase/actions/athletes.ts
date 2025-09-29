"use server";

import { createClient } from '@/lib/supabase/client';
import type { Athlete, BeltRank, Gender } from '@/lib/types/database';

const supabase = createClient();

export const athleteQueries = {
  // Get athletes by team
  getByTeam: async (teamId: string): Promise<Athlete[]> => {
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('Error fetching athletes by team:', error);
      return [];
    }

    return data || [];
  },

  // Get athlete by ID
  getById: async (id: string): Promise<Athlete | null> => {
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization,
          coach:profiles!teams_coach_id_fkey(
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching athlete by ID:', error);
      return null;
    }

    return data;
  },

  // Get athlete by profile ID
  getByProfile: async (profileId: string): Promise<Athlete | null> => {
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('profile_id', profileId)
      .single();

    if (error) {
      console.error('Error fetching athlete by profile:', error);
      return null;
    }

    return data;
  },

  // Create athlete
  create: async (athleteData: Omit<Athlete, 'id' | 'created_at' | 'updated_at'>): Promise<Athlete | null> => {
    const { data, error } = await supabase
      .from('athletes')
      .insert(athleteData)
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error creating athlete:', error);
      return null;
    }

    return data;
  },

  // Update athlete
  update: async (id: string, updates: Partial<Athlete>): Promise<Athlete | null> => {
    const { data, error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error updating athlete:', error);
      return null;
    }

    return data;
  },

  // Search athletes
  search: async (query: string, teamId?: string): Promise<Athlete[]> => {
    let queryBuilder = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('is_active', true)
      .order('full_name')
      .limit(20);

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching athletes:', error);
      return [];
    }

    return data || [];
  },

  // Get athletes by belt rank
  getByBeltRank: async (beltRank: BeltRank, teamId?: string): Promise<Athlete[]> => {
    let queryBuilder = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('belt_rank', beltRank)
      .eq('is_active', true)
      .order('full_name');

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching athletes by belt rank:', error);
      return [];
    }

    return data || [];
  },

  // Get athletes by gender
  getByGender: async (gender: Gender, teamId?: string): Promise<Athlete[]> => {
    let queryBuilder = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('gender', gender)
      .eq('is_active', true)
      .order('full_name');

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching athletes by gender:', error);
      return [];
    }

    return data || [];
  },

  // Get athletes by age range
  getByAgeRange: async (minAge: number, maxAge: number, teamId?: string): Promise<Athlete[]> => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - maxAge - 1);
    
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - minAge);

    let queryBuilder = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .gte('date_of_birth', minDate.toISOString().split('T')[0])
      .lte('date_of_birth', maxDate.toISOString().split('T')[0])
      .eq('is_active', true)
      .order('full_name');

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching athletes by age range:', error);
      return [];
    }

    return data || [];
  },

  // Get athletes registered for tournament
  getByTournament: async (tournamentId: string): Promise<Athlete[]> => {
    const { data, error } = await supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(
          id,
          full_name,
          email
        ),
        team:teams(
          id,
          name,
          organization
        ),
        tournament_registrations!inner(
          id,
          payment_status,
          checked_in,
          weighed_in,
          weight_recorded,
          height_recorded
        )
      `)
      .eq('tournament_registrations.tournament_id', tournamentId)
      .order('full_name');

    if (error) {
      console.error('Error fetching athletes by tournament:', error);
      return [];
    }

    return data || [];
  },

  // Calculate age
  calculateAge: (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  },

  // Deactivate athlete
  deactivate: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('athletes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating athlete:', error);
      return false;
    }

    return true;
  },

  // Transfer athlete to different team
  transfer: async (athleteId: string, newTeamId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('athletes')
      .update({ team_id: newTeamId })
      .eq('id', athleteId);

    if (error) {
      console.error('Error transferring athlete:', error);
      return false;
    }

    return true;
  },

  // Delete athlete (only if no tournament registrations)
  delete: async (id: string): Promise<boolean> => {
    // Check if athlete has tournament registrations
    const { count: registrationCount } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', id);

    if (registrationCount && registrationCount > 0) {
      console.error('Cannot delete athlete with tournament registrations');
      return false;
    }

    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting athlete:', error);
      return false;
    }

    return true;
  }
};
