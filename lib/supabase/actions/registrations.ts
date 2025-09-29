import { createClient } from '@/lib/supabase/client';
import type { TournamentRegistration, PaymentStatus } from '@/lib/types/database';

const supabase = createClient();

export const registrationQueries = {
  // Get registrations by tournament
  getByTournament: async (tournamentId: string): Promise<TournamentRegistration[]> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          entry_fee
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          date_of_birth
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations by tournament:', error);
      return [];
    }

    return data || [];
  },

  // Get registrations by athlete
  getByAthlete: async (athleteId: string): Promise<TournamentRegistration[]> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          location,
          entry_fee,
          status
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('athlete_id', athleteId)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations by athlete:', error);
      return [];
    }

    return data || [];
  },

  // Get registrations by team
  getByTeam: async (teamId: string): Promise<TournamentRegistration[]> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          location,
          entry_fee,
          status
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .eq('team_id', teamId)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations by team:', error);
      return [];
    }

    return data || [];
  },

  // Get registration by ID
  getById: async (id: string): Promise<TournamentRegistration | null> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          location,
          entry_fee,
          status,
          organizer:profiles!tournaments_organizer_id_fkey(
            id,
            full_name,
            email
          )
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank,
          weight,
          height,
          date_of_birth,
          emergency_contact_name,
          emergency_contact_phone
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
      console.error('Error fetching registration by ID:', error);
      return null;
    }

    return data;
  },

  // Create registration
  create: async (registrationData: Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at' | 'registration_date'>): Promise<TournamentRegistration | null> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .insert(registrationData)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          entry_fee
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error creating registration:', error);
      return null;
    }

    return data;
  },

  // Bulk create registrations
  createBulk: async (registrationsData: Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at' | 'registration_date'>[]): Promise<TournamentRegistration[]> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .insert(registrationsData)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          entry_fee
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank
        ),
        team:teams(
          id,
          name,
          organization
        )
      `);

    if (error) {
      console.error('Error creating bulk registrations:', error);
      return [];
    }

    return data || [];
  },

  // Update registration
  update: async (id: string, updates: Partial<TournamentRegistration>): Promise<TournamentRegistration | null> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          tournament_date,
          entry_fee
        ),
        athlete:athletes(
          id,
          full_name,
          gender,
          belt_rank
        ),
        team:teams(
          id,
          name,
          organization
        )
      `)
      .single();

    if (error) {
      console.error('Error updating registration:', error);
      return null;
    }

    return data;
  },

  // Update payment status
  updatePaymentStatus: async (id: string, paymentStatus: PaymentStatus, paymentReference?: string): Promise<boolean> => {
    const updates: Partial<TournamentRegistration> = { payment_status: paymentStatus };
    if (paymentReference) {
      updates.payment_reference = paymentReference;
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating payment status:', error);
      return false;
    }

    return true;
  },

  // Check in athlete
  checkIn: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        checked_in: true, 
        check_in_time: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Error checking in athlete:', error);
      return false;
    }

    return true;
  },

  // Weigh in athlete
  weighIn: async (id: string, weight: number, height?: number): Promise<boolean> => {
    const updates: Partial<TournamentRegistration> = {
      weighed_in: true,
      weigh_in_time: new Date().toISOString(),
      weight_recorded: weight
    };

    if (height) {
      updates.height_recorded = height;
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error weighing in athlete:', error);
      return false;
    }

    return true;
  },

  // Get registration statistics for tournament
  getStats: async (tournamentId: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    checkedIn: number;
    weighedIn: number;
    byGender: { male: number; female: number };
    byBeltRank: Record<string, number>;
  }> => {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select(`
        payment_status,
        checked_in,
        weighed_in,
        athlete:athletes(
          gender,
          belt_rank
        )
      `)
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error fetching registration stats:', error);
      return {
        total: 0,
        paid: 0,
        pending: 0,
        checkedIn: 0,
        weighedIn: 0,
        byGender: { male: 0, female: 0 },
        byBeltRank: {}
      };
    }

    const stats = {
      total: data.length,
      paid: data.filter(r => r.payment_status === 'paid').length,
      pending: data.filter(r => r.payment_status === 'pending').length,
      checkedIn: data.filter(r => r.checked_in).length,
      weighedIn: data.filter(r => r.weighed_in).length,
      byGender: { male: 0, female: 0 },
      byBeltRank: {} as Record<string, number>
    };

    data.forEach(registration => {
      if (registration.athlete) {
        // Gender stats
        if (registration.athlete.gender === 'male' || registration.athlete.gender === 'female') {
          stats.byGender[registration.athlete.gender]++;
        }

        // Belt rank stats
        const beltRank = registration.athlete.belt_rank;
        if (beltRank) {
          stats.byBeltRank[beltRank] = (stats.byBeltRank[beltRank] || 0) + 1;
        }
      }
    });

    return stats;
  },

  // Check if athlete is already registered for tournament
  isRegistered: async (tournamentId: string, athleteId: string): Promise<boolean> => {
    const { count } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('athlete_id', athleteId);

    return (count || 0) > 0;
  },

  // Delete registration
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting registration:', error);
      return false;
    }

    return true;
  }
};
