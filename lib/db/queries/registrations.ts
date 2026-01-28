/**
 * Tournament Registration database queries
 * 
 * Centralized data access layer for tournament registration operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { RegistrationInsert, TournamentRegistration, TournamentRegistrationInsert } from '@/types/models'
import { error } from 'console'

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

  return (data as unknown as TournamentRegistration[]) || []
}

/**
 * Get all participants for a tournament
 */
export type GetParticipantsOptions = {
  page?: number
  limit?: number
  query?: string
  teamId?: string
  belt?: string
  status?: string
  weighInStatus?: string
  weighInSelected?: boolean
  divisionId?: string
  categoryId?: string
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Get all participants for a tournament with pagination and filtering
 */
export async function getTournamentParticipants(
  tournamentId: string,
  options: GetParticipantsOptions = {},
  supabaseClient?: ReturnType<typeof createServerSupabaseClient> | any // Allow service client
) {
  const supabase = supabaseClient || createServerSupabaseClient()
  const {
    page = 1,
    limit = 10,
    query,
    teamId,
    belt,
    status,
    weighInStatus,
    weighInSelected,
    divisionId,
    categoryId,
    sort = 'created_at',
    order = 'desc'
  } = options

  const from = (page - 1) * limit
  const to = from + limit - 1

  // Base query with inner join on players for filtering
  let queryBuilder = supabase
    .from('tournament_registrations')
    .select(`
      *,
      players!inner (
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
        user_id,
        users (
          first_name,
          last_name,
          email
        )
      ),
      weighed_in_by_user:users!tournament_registrations_weighed_in_by_fkey (
        first_name,
        last_name
      ),
      tournament_divisions (
        id,
        name
      ),
      tournament_categories (
        id,
        name,
        gender,
        min_weight,
        max_weight,
        min_height,
        max_height
      )
    `, { count: 'exact' })
    .eq('tournament_id', tournamentId)

  // Apply filters
  if (teamId && teamId !== 'all') {
    queryBuilder = queryBuilder.eq('team_id', teamId)
  }

  if (divisionId && divisionId !== 'all') {
    queryBuilder = queryBuilder.eq('division_id', divisionId)
  }

  if (categoryId && categoryId !== 'all') {
    queryBuilder = queryBuilder.eq('category_id', categoryId)
  }

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (belt && belt !== 'all') {
    queryBuilder = queryBuilder.eq('players.belt_level', belt)
  }


  // Handle search query with a different approach to avoid PostgREST or() parsing issues
  // We'll fetch matching registrations in two separate queries and merge them
  if (query) {
    // First, get registrations matching player names
    const playerNameQuery = supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)

    // Search for matching teams to get their IDs
    const { data: matchingTeams } = await supabase
      .from('teams')
      .select('id')
      .ilike('name', `%${query}%`)

    const matchingTeamIds = matchingTeams?.map((t: any) => t.id) || []

    // Build a list of registration IDs that match our search criteria
    const matchingRegistrationIds = new Set<string>()

    // Get registrations by player first name
    const { data: firstNameMatches } = await supabase
      .from('tournament_registrations')
      .select('id, players!inner(first_name)')
      .eq('tournament_id', tournamentId)
      .ilike('players.first_name', `%${query}%`)

    firstNameMatches?.forEach((r: any) => matchingRegistrationIds.add(r.id))

    // Get registrations by player last name
    const { data: lastNameMatches } = await supabase
      .from('tournament_registrations')
      .select('id, players!inner(last_name)')
      .eq('tournament_id', tournamentId)
      .ilike('players.last_name', `%${query}%`)

    lastNameMatches?.forEach((r: any) => matchingRegistrationIds.add(r.id))

    // Get registrations by team ID
    if (matchingTeamIds.length > 0) {
      const { data: teamMatches } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .in('team_id', matchingTeamIds)

      teamMatches?.forEach((r: any) => matchingRegistrationIds.add(r.id))
    }

    // Filter main query to only include matching registration IDs
    if (matchingRegistrationIds.size > 0) {
      queryBuilder = queryBuilder.in('id', Array.from(matchingRegistrationIds))
    } else {
      // No matches found, return empty result
      queryBuilder = queryBuilder.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  if (weighInStatus && weighInStatus !== 'all') {
    if (weighInStatus === 'completed') {
      queryBuilder = queryBuilder.not('weighed_in_at', 'is', null)
    } else if (weighInStatus === 'pending') {
      queryBuilder = queryBuilder.is('weighed_in_at', null).eq('status', 'verified')
    } else if (weighInStatus === 'not-required') {
      queryBuilder = queryBuilder.is('weighed_in_at', null).neq('status', 'verified')
    }
  }

  if (weighInSelected !== undefined) {
    queryBuilder = queryBuilder.eq('weigh_in_selected', weighInSelected)
    if (weighInSelected === true) {
      queryBuilder = queryBuilder.eq('status', 'verified')
    }
  }

  // Apply sorting
  if (sort === 'name') {
    // Sort by player last name
    queryBuilder = queryBuilder.order('players(last_name)', { ascending: order === 'asc' })
  } else if (sort === 'team') {
    queryBuilder = queryBuilder.order('teams(name)', { ascending: order === 'asc' })
  } else if (sort === 'belt') {
    queryBuilder = queryBuilder.order('players(belt_level)', { ascending: order === 'asc' })
  } else if (sort === 'status') {
    queryBuilder = queryBuilder.order('status', { ascending: order === 'asc' })
  } else if (sort === 'weighIn') {
    queryBuilder = queryBuilder.order('weighed_in_at', { ascending: order === 'asc', nullsFirst: false })
  } else {
    // Default sort
    queryBuilder = queryBuilder.order('created_at', { ascending: false })
  }

  // Apply pagination only for reasonable limits (for UI tables)
  // For dashboard stats with high limits, skip pagination to get all records
  if (limit < 5000) {
    queryBuilder = queryBuilder.range(from, to)
  }

  const { data, error, count } = await queryBuilder

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`)
  }

  // Transform the data to match expected structure
  // Spread all original fields first to preserve weighed_in_by and other fields
  const transformedData = data?.map((item: any) => ({
    ...item, // Preserve all original fields including weighed_in_by
    player: item.players,
    team: item.teams,
    weighed_in_by_user: item.weighed_in_by_user
  })) || []

  return {
    data: transformedData,
    count: count || 0,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0
  }
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
 * 
 * Optimized: Uses single joined query instead of N+1 pattern
 */
export async function getActiveRegistrationCount(coachId: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  // Single query with inner join - replaces N+1 pattern
  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('id, teams!inner(user_id)', { count: 'exact', head: true })
    .eq('teams.user_id', coachId)

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
/**
 * Create a single registration
 */
export async function createRegistration(data: TournamentRegistrationInsert): Promise<void> {
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
  actualHeight: number | null,
  weighedInBy: string
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      actual_weight: actualWeight,
      actual_height: actualHeight,
      weighed_in_at: new Date().toISOString(),
      weighed_in_by: weighedInBy
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

/**
 * Get total registrations count for all tournaments organized by a user
 */
export async function getTotalRegistrationsByOrganizerId(organizerId: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('*, tournaments!inner(organizer_id)', { count: 'exact', head: true })
    .eq('tournaments.organizer_id', organizerId)

  if (error) {
    throw new Error(`Failed to count total registrations: ${error.message}`)
  }

  return count || 0
}

/**
 * Get recent registrations for all tournaments organized by a user
 */
export async function getRecentRegistrationsByOrganizerId(organizerId: string, limit: number = 5, offset: number = 0) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      id,
      created_at,
      status,
      players (
        first_name,
        last_name
      ),
      tournaments!inner (
        id,
        name,
        organizer_id
      ),
      teams (
        id,
        name
      )
    `)
    .eq('tournaments.organizer_id', organizerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch recent registrations: ${error.message}`)
  }

  return data || []
}

/**
 * Clear weigh-in selection for all participants in a tournament
 */
export async function clearWeighInSelected(tournamentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      weigh_in_selected: false,
      weighed_in_at: null,
      actual_weight: null,
      actual_height: null,
      weighed_in_by: null
    })
    .eq('tournament_id', tournamentId)

  if (error) {
    throw new Error(`Failed to clear weigh-in selection: ${error.message}`)
  }
}

/**
 * Get recent registrations for a coach
 */
export async function getRecentRegistrationsByCoachId(coachId: string, limit: number = 5) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      id,
      created_at,
      status,
      players (
        first_name,
        last_name
      ),
      tournaments (
        id,
        name
      )
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch recent coach registrations: ${error.message}`)
  }

  return data || []
}
