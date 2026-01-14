
/**
 * Payment database queries
 * 
 * Centralized data access layer for payment operations.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Payment, PaymentInsert, PaymentUpdate } from '@/types/models'

/**
 * Create a new payment
 */
export async function createPayment(data: PaymentInsert): Promise<Payment> {
  const supabase = createServerSupabaseClient()

  const { data: payment, error } = await (supabase as any)
    .from('payments')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  return payment
}

/**
 * Get payments for a tournament (Organizer view)
 */
export async function getTournamentPayments(tournamentId: string): Promise<Payment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }

  // Map relations if needed, but typed as Payment here implicitly generic
  return data || []
}

/**
 * Get payments for a team (Coach view)
 */
export async function getTeamPayments(teamId: string, tournamentId: string): Promise<Payment[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select('*')
    .eq('team_id', teamId)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch team payments: ${error.message}`)
  }

  return data || []
}

/**
 * Update payment status
 * If verifying, also updates related registrations to 'paid'
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'verified' | 'rejected',
  // Optional: pass team_id/tournament_id to update registrations efficiently
  // without re-fetching payment
  context?: { teamId: string, tournamentId: string },
  reason?: string
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // 1. Update Payment Status
  const updateData: any = { status }
  if (status === 'rejected' && reason) {
    updateData.rejection_reason = reason
  }

  const { data: payment, error: paymentError } = await (supabase as any)
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single()

  if (paymentError) {
    throw new Error(`Failed to update payment status: ${paymentError.message}`)
  }

  // 2. If verified, update team registrations
  if (status === 'verified') {
    const tid = context?.tournamentId || payment.tournament_id
    const teamId = context?.teamId || payment.team_id

    const { error: regError } = await supabase
      .from('tournament_registrations')
      .update({ status: 'paid' })
      .eq('tournament_id', tid)
      .eq('team_id', teamId)
      // Only update if currently 'pending' or 'verified' (don't override cancelled etc if any)
      .in('status', ['pending', 'verified'])

    if (regError) {
      // Log error but don't fail the payment update? Or throw?
      throw new Error(`Payment verified but failed to update registrations: ${regError.message}`)
    }
  }
}

/**
 * Get total confirmed revenue for an organizer
 */
export async function getTotalRevenueByOrganizerId(organizerId: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select('amount, tournaments!inner(organizer_id)')
    .eq('tournaments.organizer_id', organizerId)
    .eq('status', 'verified')

  if (error) {
    throw new Error(`Failed to calculate total revenue: ${error.message}`)
  }

  // Sum up the amounts using reduce with explicit typing or casting
  const total = (data as any[] || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)

  return total
}

/**
 * Get all pending payments for an organizer
 */
export async function getPendingPaymentsByOrganizer(organizerId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select(`
      *,
      tournaments!inner (
        id,
        name,
        organizer_id
      ),
      teams (
        id,
        name,
        user_id // coach_id
      )
    `)
    .eq('tournaments.organizer_id', organizerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending payments: ${error.message}`)
  }

  return data || []
}

/**
 * Get all pending payments for a specific tournament
 */
export async function getPendingPaymentsByTournament(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select(`
      *,
      tournaments!inner (
        id,
        name
      ),
      teams (
        id,
        name,
        user_id
      )
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending payments: ${error.message}`)
  }

  return data || []
}

/**
 * Get all payments for a coach
 */
export async function getCoachPayments(coachId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payments')
    .select(`
      *,
      tournaments (
        id,
        name
      ),
      teams (
        id,
        name
      )
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch coach payments: ${error.message}`)
  }

  return data || []
}
