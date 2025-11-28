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
export async function getTournamentsByOrganizerId(organizerId: string): Promise<Tournament[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch tournaments: ${error.message}`)
  }

  return data || []
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

  return data
}

/**
 * Create a new tournament
 * 
 * @param tournamentData - Tournament data to insert
 * @returns Created tournament object
 */
export async function createTournament(tournamentData: TournamentInsert): Promise<Tournament> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournaments')
    .insert(tournamentData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tournament: ${error.message}`)
  }

  return data
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

  const { data, error } = await supabase
    .from('tournaments')
    .update(tournamentData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tournament: ${error.message}`)
  }

  return data
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

  return data || []
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

  return data || []
}



