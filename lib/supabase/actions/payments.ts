import { createClient } from '@/lib/supabase/client';
import type { PaymentStatus } from '@/lib/types/database';

const supabase = createClient();

// Team Payment interface
export interface TeamPayment {
  id: string;
  tournament_id: string;
  team_id: string;
  coach_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method?: string;
  payment_reference?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tournament?: {
    id: string;
    name: string;
    entry_fee: number;
  };
  team?: {
    id: string;
    name: string;
    organization?: string;
  };
  coach?: {
    id: string;
    full_name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
  };
}

export const paymentQueries = {
  // Get team payments by coach
  getByCoach: async (coachId: string): Promise<TeamPayment[]> => {
    const { data, error } = await supabase
      .from('team_payments')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        ),
        reviewer:profiles!team_payments_reviewed_by_fkey(
          id,
          full_name
        )
      `)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments by coach:', error);
      return [];
    }

    return data || [];
  },

  // Get team payments by tournament
  getByTournament: async (tournamentId: string): Promise<TeamPayment[]> => {
    const { data, error } = await supabase
      .from('team_payments')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        ),
        reviewer:profiles!team_payments_reviewed_by_fkey(
          id,
          full_name
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments by tournament:', error);
      return [];
    }

    return data || [];
  },

  // Get payment by ID
  getById: async (id: string): Promise<TeamPayment | null> => {
    const { data, error } = await supabase
      .from('team_payments')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        ),
        reviewer:profiles!team_payments_reviewed_by_fkey(
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching payment by ID:', error);
      return null;
    }

    return data;
  },

  // Create team payment
  create: async (paymentData: Omit<TeamPayment, 'id' | 'created_at' | 'updated_at'>): Promise<TeamPayment | null> => {
    const { data, error } = await supabase
      .from('team_payments')
      .insert(paymentData)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return null;
    }

    return data;
  },

  // Update payment status
  updateStatus: async (id: string, status: PaymentStatus, reviewerId?: string, notes?: string): Promise<TeamPayment | null> => {
    const updateData: Partial<TeamPayment> = {
      status,
      reviewed_at: new Date().toISOString(),
      notes
    };

    if (reviewerId) {
      updateData.reviewed_by = reviewerId;
    }

    const { data, error } = await supabase
      .from('team_payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        ),
        reviewer:profiles!team_payments_reviewed_by_fkey(
          id,
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      return null;
    }

    return data;
  },

  // Get payments by status
  getByStatus: async (status: PaymentStatus): Promise<TeamPayment[]> => {
    const { data, error } = await supabase
      .from('team_payments')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        ),
        reviewer:profiles!team_payments_reviewed_by_fkey(
          id,
          full_name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments by status:', error);
      return [];
    }

    return data || [];
  },

  // Get pending payments for organizer review
  getPendingForReview: async (): Promise<TeamPayment[]> => {
    const { data, error } = await supabase
      .from('team_payments')
      .select(`
        *,
        tournament:tournaments(
          id,
          name,
          entry_fee
        ),
        team:teams(
          id,
          name,
          organization
        ),
        coach:profiles!team_payments_coach_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'pending_approval')
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending payments:', error);
      return [];
    }

    return data || [];
  },

  // Get payment statistics for tournament
  getStats: async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('team_payments')
      .select('status, amount')
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Error fetching payment stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
        totalAmount: 0,
        paidAmount: 0
      };
    }

    const stats = {
      total: data.length,
      pending: data.filter(p => p.status === 'pending' || p.status === 'pending_approval').length,
      approved: data.filter(p => p.status === 'approved').length,
      paid: data.filter(p => p.status === 'paid').length,
      rejected: data.filter(p => p.status === 'rejected').length,
      totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: data.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
    };

    return stats;
  },

  // Update payment reference (for payment confirmation)
  updatePaymentReference: async (id: string, paymentReference: string, paymentMethod?: string): Promise<boolean> => {
    const { error } = await supabase
      .from('team_payments')
      .update({
        payment_reference: paymentReference,
        payment_method: paymentMethod,
        status: 'pending_approval'
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating payment reference:', error);
      return false;
    }

    return true;
  },

  // Delete payment
  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('team_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment:', error);
      return false;
    }

    return true;
  }
};
