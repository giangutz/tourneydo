import { createClient } from '@/lib/supabase/client';
import type { Tournament, TournamentStatus } from '@/lib/types/database';

const supabase = createClient();

export const tournamentQueries = {
  // Get all public tournaments
  getPublic: async (): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .eq('is_public', true)
      .order('tournament_date', { ascending: true });

    if (error) {
      console.error('Error fetching public tournaments:', error);
      return [];
    }

    return data || [];
  },

  // Get tournament by ID with organizer info
  getById: async (id: string): Promise<Tournament | null> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tournament by ID:', error);
      return null;
    }

    return data;
  },

  // Get tournaments by organizer
  getByOrganizer: async (organizerId: string): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .eq('organizer_id', organizerId)
      .order('tournament_date', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments by organizer:', error);
      return [];
    }

    return data || [];
  },

  // Create tournament
  create: async (tournamentData: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>): Promise<Tournament | null> => {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournamentData)
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      return null;
    }

    return data;
  },

  // Update tournament
  update: async (id: string, updates: Partial<Tournament>): Promise<Tournament | null> => {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error updating tournament:', error);
      return null;
    }

    return data;
  },

  // Update tournament status
  updateStatus: async (id: string, status: TournamentStatus): Promise<boolean> => {
    const { error } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating tournament status:', error);
      return false;
    }

    return true;
  },

  // Get tournaments by status
  getByStatus: async (status: TournamentStatus): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .eq('status', status)
      .eq('is_public', true)
      .order('tournament_date', { ascending: true });

    if (error) {
      console.error('Error fetching tournaments by status:', error);
      return [];
    }

    return data || [];
  },

  // Search tournaments
  search: async (query: string): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .or(`name.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_public', true)
      .order('tournament_date', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error searching tournaments:', error);
      return [];
    }

    return data || [];
  },

  // Get upcoming tournaments
  getUpcoming: async (limit: number = 10): Promise<Tournament[]> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        organizer:profiles!tournaments_organizer_id_fkey(
          id,
          full_name,
          email,
          organization
        )
      `)
      .eq('is_public', true)
      .gte('tournament_date', new Date().toISOString().split('T')[0])
      .order('tournament_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming tournaments:', error);
      return [];
    }

    return data || [];
  },

  // Delete tournament
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tournament:', error);
      return false;
    }

    return true;
  }
};
