/**
 * Tournament Registration database queries
 * 
 * Centralized data access layer for tournament registration operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { RegistrationInsert } from '@/types/models'

/**
 * Register a team for a tournament
 */
export async function registerTeamForTournament(
  tournamentId: string,
  teamId: string,
  coachId: string,
  playerIds: string[]
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // If no players selected, remove all registrations for this team/tournament
  if (!playerIds || playerIds.length === 0) {
    const { error: deleteError } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)

    if (deleteError) {
      throw new Error(`Failed to unregister: ${deleteError.message}`)
    }
    return
  }

  // 1. Verify players belong to the team
  const { data: teamPlayers, error: playersError } = await supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', teamId)
    .in('player_id', playerIds)

  if (playersError) {
    throw new Error(`Failed to verify team players: ${playersError.message}`)
  }

  if (!teamPlayers || teamPlayers.length !== playerIds.length) {
    throw new Error('Some selected players do not belong to this team')
  }

  // 2. Get existing registrations for this team in this tournament
  const { data: existingRegistrations, error: existingError } = await supabase
    .from('tournament_registrations')
    .select('player_id')
    .eq('tournament_id', tournamentId)
    .eq('team_id', teamId)

  if (existingError) {
    throw new Error(`Failed to check existing registrations: ${existingError.message}`)
  }

  const existingPlayerIds = existingRegistrations?.map(r => r.player_id) || []

  // 3. Calculate players to add and remove
  const playersToAdd = playerIds.filter(id => !existingPlayerIds.includes(id))
  const playersToRemove = existingPlayerIds.filter(id => !playerIds.includes(id))

  // 4. Remove players
  if (playersToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)
      .in('player_id', playersToRemove)

    if (deleteError) {
      throw new Error(`Failed to remove players: ${deleteError.message}`)
    }
  }

  // 5. Add new players
  if (playersToAdd.length > 0) {
    const registrations = playersToAdd.map(playerId => ({
      tournament_id: tournamentId,
      team_id: teamId,
      player_id: playerId,
      coach_id: coachId,
      status: 'pending'
    }))

    const { error: insertError } = await supabase
      .from('tournament_registrations')
      .insert(registrations)

    if (insertError) {
      throw new Error(`Failed to register players: ${insertError.message}`)
    }
  }
}

/**
 * Get all registrations for a coach
 */
export async function getCoachRegistrations(coachId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('coach_id', coachId)

  if (error) {
    throw new Error(`Failed to fetch coach registrations: ${error.message}`)
  }

  return data || []
}

/**
 * Get all participants for a tournament
 */
export async function getTournamentParticipants(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      players (
        id,
        first_name,
        last_name,
        belt_level,
        weight,
        height,
        gender,
        dob,
        coach_id
      ),
      teams (
        id,
        name,
        user_id
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`)
  }

  // Transform the data to match expected structure
  const transformedData = data?.map(item => ({
    ...item,
    player: item.players,
    team: item.teams
  })) || []

  return transformedData
}

/**
 * Update registration status
 */
export async function updateRegistrationStatus(
  registrationId: string,
  updates: { status?: 'pending' | 'verified' | 'paid' }
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update(updates)
    .eq('id', registrationId)

  if (error) {
    throw new Error(`Failed to update registration: ${error.message}`)
  }
}
/**
 * Get active registration count for a coach's teams
 * 
 * @param coachId - Coach's user ID
 * @returns Number of active registrations
 */
export async function getActiveRegistrationCount(coachId: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  // First get all team IDs for this coach
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('user_id', coachId)

  if (!teams || teams.length === 0) {
    return 0
  }

  const teamIds = teams.map(t => t.id)

  // Count registrations for these teams
  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .in('team_id', teamIds)

  if (error) {
    throw new Error(`Failed to count registrations: ${error.message}`)
  }

  return count || 0
}

/**
 * Get upcoming events count (tournaments starting in the next 30 days)
 * 
 * @returns Number of upcoming events
 */
export async function getUpcomingEventsCount(): Promise<number> {
  const supabase = createServerSupabaseClient()

  const today = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  const { count, error } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact', head: true })
    .gte('start_date', today.toISOString())
    .lte('start_date', thirtyDaysFromNow.toISOString())

  if (error) {
    throw new Error(`Failed to count upcoming events: ${error.message}`)
  }

  return count || 0
}
/**
 * Create a single registration
 */
export async function createRegistration(data: RegistrationInsert): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .insert(data)

  if (error) {
    throw new Error(`Failed to create registration: ${error.message}`)
  }
}

/**
 * Update weigh-in data for a registration
 */
export async function updateWeighIn(
  registrationId: string,
  actualWeight: number | null,
  actualHeight: number | null
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      actual_weight: actualWeight,
      actual_height: actualHeight,
      weighed_in_at: new Date().toISOString()
    })
    .eq('id', registrationId)

  if (error) {
    throw new Error(`Failed to update weigh-in: ${error.message}`)
  }
}

/**
 * Update division assignment for a registration
 */
export async function updateDivisionAssignment(
  registrationId: string,
  divisionId: string,
  categoryId: string
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      division_id: divisionId,
      category_id: categoryId
    })
    .eq('id', registrationId)

  if (error) {
    throw new Error(`Failed to update division assignment: ${error.message}`)
  }
}

/**
 * Update disqualification status for a registration
 */
export async function updateDisqualification(
  registrationId: string,
  disqualified: boolean,
  reason: string | null
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      disqualified,
      disqualification_reason: reason
    })
    .eq('id', registrationId)

  if (error) {
    throw new Error(`Failed to update disqualification: ${error.message}`)
  }
}

/**
 * Get a single registration by ID with player and team data
 */
export async function getRegistrationById(registrationId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      players (
        id,
        first_name,
        last_name,
        belt_level,
        weight,
        height,
        gender,
        dob,
        coach_id
      ),
      teams (
        id,
        name,
        user_id
      )
    `)
    .eq('id', registrationId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch registration: ${error.message}`)
  }

  return {
    ...data,
    player: data.players,
    team: data.teams
  }
}
