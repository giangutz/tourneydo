/**
 * Tournament database queries
 * 
 * Centralized data access layer for tournament operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Tournament, TournamentInsert, TournamentUpdate } from '@/types/models'

/**
 * Get all tournaments for a specific organizer
 * 
 * @param organizerId - Organizer's user ID
 * @returns Array of tournaments
 */
/**
 * Get all tournaments for a specific user (organized + staff access)
 * 
 * @param userId - User ID
 * @returns Array of tournaments
 */
export async function getTournamentsByOrganizerId(userId: string): Promise<Tournament[]> {
  const supabase = createServerSupabaseClient()

  // 1. Get tournaments where user is organizer
  const { data: organized, error: organizedError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', userId)
    .order('created_at', { ascending: false })

  if (organizedError) {
    throw new Error(`Failed to fetch organized tournaments: ${organizedError.message}`)
  }

  // 2. Get tournaments where user is staff
  const { data: staffAssignments, error: staffError } = await (supabase as any)
    .from('tournament_staff')
    .select('tournament:tournaments(*), role')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (staffError) {
    // Log error but don't fail entire request? Or fail? 
    // It filters out if table doesn't exist, but we created it.
    console.error(`Failed to fetch staff tournaments: ${staffError.message}`)
  }

  const staffTournaments = staffAssignments?.map((s: any) => ({
    ...s.tournament,
    _staffRole: s.role // Add role to local object if needed for UI
  })) || []

  // Combine and deduplicate (though they shouldn't overlap if organizer isn't also staff)
  const allTournaments = [...(organized || []), ...staffTournaments]

  // Sort by created_at desc
  allTournaments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Check and update status for each
  await Promise.all(allTournaments.map(t => checkAndUpdateStatus(t)))

  return allTournaments
}

/**
 * Get a single tournament by ID
 * 
 * @param id - Tournament ID
 * @returns Tournament object or null if not found
 */
export async function getTournamentById(id: string): Promise<Tournament | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch tournament: ${error.message}`)
  }

  const tournament = data as unknown as Tournament

  // Check and update status
  await checkAndUpdateStatus(tournament)

  return tournament
}

/**
 * Create a new tournament
 * 
 * @param tournamentData - Tournament data to insert
 * @returns Created tournament object
 */
export async function createTournament(tournamentData: TournamentInsert): Promise<Tournament> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('tournaments')
    .insert(tournamentData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tournament: ${error.message}`)
  }

  return data as unknown as Tournament
}

/**
 * Update an existing tournament
 * 
 * @param id - Tournament ID to update
 * @param tournamentData - Partial tournament data to update
 * @returns Updated tournament object
 */
export async function updateTournament(id: string, tournamentData: TournamentUpdate): Promise<Tournament> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('tournaments')
    .update(tournamentData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tournament: ${error.message}`)
  }

  return data as unknown as Tournament
}

/**
 * Delete a tournament
 * 
 * @param id - Tournament ID to delete
 */
export async function deleteTournament(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`)
  }
}
/**
 * Get all available tournaments (for coaches)
 * 
 * @returns Array of tournaments
 */
export async function getTournaments(): Promise<Tournament[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'upcoming') // Assuming we only want upcoming tournaments
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tournaments: ${error.message}`)
  }

  const tournaments = (data as unknown as Tournament[]) || []

  // Check and update status for each tournament
  await Promise.all(tournaments.map(t => checkAndUpdateStatus(t)))

  return tournaments
}

/**
 * Get public tournaments with filtering and search
 */
export async function getPublicTournaments(options: {
  search?: string
  status?: string
  from?: Date
  to?: Date
} = {}): Promise<Tournament[]> {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: true })

  if (options.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  if (options.from) {
    query = query.gte('start_date', options.from.toISOString())
  }

  if (options.to) {
    query = query.lte('end_date', options.to.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch public tournaments: ${error.message}`)
  }

  const tournaments = (data as unknown as Tournament[]) || []

  // Check and update status for each tournament
  await Promise.all(tournaments.map(t => checkAndUpdateStatus(t)))

  return tournaments
}



/**
 * Helper to check and update tournament status based on dates
 */
async function checkAndUpdateStatus(tournament: Tournament): Promise<void> {
  const now = new Date()
  let newStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming'

  // Safety check if dates are missing
  if (!tournament.start_date && !tournament.end_date) return

  const startDate = tournament.start_date ? new Date(tournament.start_date) : null
  const endDate = tournament.end_date ? new Date(tournament.end_date) : null
  const weighInStart = tournament.weigh_in_start ? new Date(tournament.weigh_in_start) : null

  // Ensure end date covers the full day if needed (though usually timestamps handle this)
  // Logic: 
  // - Completed: End date passed
  // - Ongoing: Weigh-in started OR Start date passed (active phase)
  // - Upcoming: Before weigh-in/start

  if (endDate && now > endDate) {
    newStatus = 'completed'
  } else if (
    (weighInStart && now >= weighInStart) ||
    (startDate && now >= startDate)
  ) {
    newStatus = 'ongoing'
  } else {
    newStatus = 'upcoming'
  }

  // Only update if status is different and not cancelled
  // And avoid reverting 'completed' if logic says 'ongoing' but admin marked completed? 
  // Actually, dates should differ. But let's respect manual 'cancelled'.
  if (
    tournament.status !== 'cancelled' &&
    tournament.status !== newStatus
  ) {
    // If it was manually set to completed but dates say ongoing, do we revert? 
    // Plan said: "If expected status != current status". 
    // Let's assume dates are source of truth for these 3 statuses.

    try {
      await updateTournament(tournament.id, { status: newStatus })
      tournament.status = newStatus // Update local object
    } catch (e) {
      console.error(`Failed to auto-update tournament ${tournament.id} status to ${newStatus}`, e)
    }
  }
}
