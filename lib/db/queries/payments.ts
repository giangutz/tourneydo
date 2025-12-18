
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

  const { data: payment, error } = await supabase
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

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
  context?: { teamId: string, tournamentId: string }
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // 1. Update Payment Status
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({ status })
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
      .update({ status: 'paid', payment_status: 'paid' }) // Update both status and payment_status
      .eq('tournament_id', tid)
      .eq('team_id', teamId)
      // Only update if currently 'pending' or 'verified' (don't override cancelled etc if any)
      .in('status', ['pending', 'verified'])

    if (regError) {
      // Log error but don't fail the payment update? Or throw?
      // Better to throw so UI knows partial failure
      throw new Error(`Payment verified but failed to update registrations: ${regError.message}`)
    }
  }
}
