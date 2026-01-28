
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
 * Create a new payment with linked players
 */
export async function createPaymentWithPlayers(
  data: PaymentInsert,
  playerIds: string[]
): Promise<Payment> {
  const supabase = createServerSupabaseClient()

  // 1. Create the payment
  const { data: payment, error: paymentError } = await (supabase as any)
    .from('payments')
    .insert(data)
    .select()
    .single()

  if (paymentError) {
    throw new Error(`Failed to create payment: ${paymentError.message}`)
  }

  // 2. Link players to payment
  if (playerIds.length > 0) {
    const paymentPlayers = playerIds.map(playerId => ({
      payment_id: payment.id,
      player_id: playerId
    }))

    const { error: linkError } = await (supabase as any)
      .from('payment_players')
      .insert(paymentPlayers)

    if (linkError) {
      // Rollback: delete the payment if linking fails
      await (supabase as any).from('payments').delete().eq('id', payment.id)
      throw new Error(`Failed to link players to payment: ${linkError.message}`)
    }

    // 3. Update registration status for selected players to 'paid'
    const { error: regError } = await supabase
      .from('tournament_registrations')
      .update({ status: 'paid' })
      .eq('tournament_id', data.tournament_id)
      .eq('team_id', data.team_id)
      .in('player_id', playerIds)
      .in('status', ['pending', 'verified']) // Only update if not already paid

    if (regError) {
      console.error('Failed to update registration status:', regError)
      // Don't throw - payment is created, just log the error
    }
  }

  return payment
}

/**
 * Get players linked to a payment
 */
export async function getPaymentPlayers(paymentId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('payment_players')
    .select('player_id')
    .eq('payment_id', paymentId)

  if (error) {
    throw new Error(`Failed to fetch payment players: ${error.message}`)
  }

  return (data || []).map((row: any) => row.player_id)
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
 * If verifying, also updates related registrations to 'verified' for linked players
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'verified' | 'rejected',
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

  // 2. If verified, update ONLY the players linked to this payment
  if (status === 'verified') {
    // Get players linked to this payment
    const playerIds = await getPaymentPlayers(paymentId)

    if (playerIds.length > 0) {
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .update({ status: 'verified' })
        .eq('tournament_id', payment.tournament_id)
        .eq('team_id', payment.team_id)
        .in('player_id', playerIds)
        .in('status', ['paid']) // Only update players who are in 'paid' status

      if (regError) {
        throw new Error(`Payment verified but failed to update registrations: ${regError.message}`)
      }
    }
  } else if (status === 'rejected') {
    // Revert to pending if rejected
    const playerIds = await getPaymentPlayers(paymentId)

    if (playerIds.length > 0) {
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .update({ status: 'pending' })
        .eq('tournament_id', payment.tournament_id)
        .eq('team_id', payment.team_id)
        .in('player_id', playerIds)
        .eq('status', 'paid') // Only revert if they were marked as 'paid'

      if (regError) {
        throw new Error(`Payment rejected but failed to revert registrations: ${regError.message}`)
      }
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
        user_id
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
      ),
      payment_players (
        players (
          id,
          first_name,
          last_name
        )
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

/**
 * Get payments for a tournament with pagination and search (Organizer view)
 */
export async function getTournamentPaymentsPaginated(
  tournamentId: string,
  page: number = 1,
  pageSize: number = 10,
  query: string = ''
): Promise<{ data: Payment[], totalPages: number }> {
  const supabase = createServerSupabaseClient()
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  let dbQuery = (supabase as any)
    .from('payments')
    .select(`
      *,
      teams!inner (
        id,
        name
      ),
      payment_players (
        players (
          id,
          first_name,
          last_name
        )
      )
    `, { count: 'exact' })
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (query && query.trim() !== '') {
    // Search by team name or reference number
    dbQuery = dbQuery.or(`reference_number.ilike.%${query}%,teams.name.ilike.%${query}%`)
  }

  // Apply range
  dbQuery = dbQuery.range(start, end)

  const { data, error, count } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }



  return {
    data: data || [],
    totalPages: Math.ceil((count || 0) / pageSize)
  }
}

/**
 * Grouped Payment Transaction Interface
 */
export interface PaymentGroup {
  reference_number: string
  total_amount: number
  created_at: string
  status: 'mixed' | 'pending' | 'verified' | 'rejected'
  rejection_reason?: string
  tournament_names: string[]
  team_names: string[]
  payment_count: number
  athletes: { id: string; first_name: string; last_name: string }[]
  payments: any[]
}

/**
 * Get payments for a coach, grouped by reference number
 * Simulates pagination on the grouped result
 */
export async function getCoachPaymentGroupsPaginated(
  coachId: string,
  page: number = 1,
  pageSize: number = 10,
  query: string = ''
): Promise<{ data: PaymentGroup[], totalPages: number }> {
  const supabase = createServerSupabaseClient()

  // Fetch ALL matching payments first (upto a reasonable limit)
  // We need to fetch all to group them correctly before pagination
  let dbQuery = (supabase as any)
    .from('payments')
    .select(`
      *,
      tournaments (name),
      teams (name)
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (query && query.trim() !== '') {
    dbQuery = dbQuery.or(`reference_number.ilike.%${query}%,tournaments.name.ilike.%${query}%,teams.name.ilike.%${query}%`)
  }

  const { data: payments, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch coach payments: ${error.message}`)
  }

  if (!payments || payments.length === 0) {
    return { data: [], totalPages: 0 }
  }

  // Group by reference number
  const groups: Record<string, PaymentGroup> = {}

  payments.forEach((p: any) => {
    const ref = p.reference_number
    if (!groups[ref]) {
      groups[ref] = {
        reference_number: ref,
        total_amount: 0,
        created_at: p.created_at, // Use the most recent one (since sorted desc)
        status: p.status, // Initial status
        tournament_names: [],
        team_names: [],
        payment_count: 0,
        athletes: [],
        payments: []
      }
    }

    const group = groups[ref]
    group.total_amount += Number(p.amount)
    group.payment_count++
    group.payments.push(p)

    // Collect names uniquely
    const tName = p.tournaments?.name
    if (tName && !group.tournament_names.includes(tName)) {
      group.tournament_names.push(tName)
    }

    const teamName = p.teams?.name
    if (teamName && !group.team_names.includes(teamName)) {
      group.team_names.push(teamName)
    }

    // Determine aggregate status
    if (group.status !== 'mixed') {
      if (group.status !== p.status) {
        group.status = 'mixed'
      }
    }

    // Updates rejection reason if any payment is rejected
    if (p.rejection_reason && !group.rejection_reason) {
      group.rejection_reason = p.rejection_reason
    }
  })

  // Convert to array and sort by created_at (most recent first)
  const groupedArray = Object.values(groups).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Paginate
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedData = groupedArray.slice(start, end)

  return {
    data: paginatedData,
    totalPages: Math.ceil(groupedArray.length / pageSize)
  }
}

/**
 * Get payments for a tournament, grouped by reference number
 * Used by organizers for easier verification
 */
export async function getTournamentPaymentGroupsPaginated(
  tournamentId: string,
  page: number = 1,
  pageSize: number = 10,
  query: string = ''
): Promise<{ data: PaymentGroup[], totalPages: number }> {
  const supabase = createServerSupabaseClient()

  let dbQuery = (supabase as any)
    .from('payments')
    .select(`
      *,
      teams (name),
      payment_players (
        players (
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (query && query.trim() !== '') {
    dbQuery = dbQuery.or(`reference_number.ilike.%${query}%,teams.name.ilike.%${query}%`)
  }

  const { data: payments, error } = await dbQuery

  if (error) {
    throw new Error(`Failed to fetch tournament payments: ${error.message}`)
  }

  if (!payments || payments.length === 0) {
    return { data: [], totalPages: 0 }
  }

  // Group by reference number
  const groups: Record<string, PaymentGroup> = {}

  payments.forEach((p: any) => {
    const ref = p.reference_number
    if (!groups[ref]) {
      groups[ref] = {
        reference_number: ref,
        total_amount: 0,
        created_at: p.created_at,
        status: p.status,
        tournament_names: [],
        team_names: [],
        payment_count: 0,
        athletes: [],
        payments: []
      }
    }

    const group = groups[ref]
    group.total_amount += Number(p.amount)
    group.payment_count++
    group.payments.push(p)

    const teamName = p.teams?.name
    if (teamName && !group.team_names.includes(teamName)) {
      group.team_names.push(teamName)
    }

    // Collect athletes
    p.payment_players?.forEach((pp: any) => {
      if (pp.players && !group.athletes.some(a => a.id === pp.players.id)) {
        group.athletes.push(pp.players)
      }
    })

    // Aggregate status
    if (group.status !== 'mixed') {
      if (group.status !== p.status) {
        group.status = 'mixed'
      }
    }

    if (p.rejection_reason && !group.rejection_reason) {
      group.rejection_reason = p.rejection_reason
    }
  })

  const groupedArray = Object.values(groups).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedData = groupedArray.slice(start, end)

  return {
    data: paginatedData,
    totalPages: Math.ceil(groupedArray.length / pageSize)
  }
}

/**
 * Get recent payments for an organizer (regardless of status)
 */
export async function getRecentPaymentsByOrganizer(organizerId: string, limit: number = 10, offset: number = 0) {
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
        user_id
      )
    `)
    .eq('tournaments.organizer_id', organizerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch recent payments: ${error.message}`)
  }

  return data || []
}

/**
 * Get recent payments for a coach
 */
export async function getRecentPaymentsByCoachId(coachId: string, limit: number = 10) {
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
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch recent coach payments: ${error.message}`)
  }

  return data || []
}
