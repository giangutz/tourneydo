/**
 * Player database queries
 * 
 * Centralized data access layer for player operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Player, PlayerInsert, PlayerUpdate, Team } from '@/types/models'

/**
 * Get all players for a specific coach
 * 
 * @param coachId - Coach's user ID
 * @returns Array of players
 */
export async function getPlayersByCoachId(coachId: string): Promise<Player[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch players: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single player by ID
 * 
 * @param id - Player ID
 * @returns Player object or null if not found
 */
export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch player: ${error.message}`)
  }

  return data
}

/**
 * Create a new player
 * 
 * @param playerData - Player data to insert
 * @returns Created player object
 */
export async function createPlayer(playerData: PlayerInsert): Promise<Player> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .insert(playerData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create player: ${error.message}`)
  }

  return data
}

/**
 * Update an existing player
 * 
 * @param id - Player ID to update
 * @param playerData - Partial player data to update
 * @returns Updated player object
 */
export async function updatePlayer(id: string, playerData: PlayerUpdate): Promise<Player> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .update(playerData)
    .eq('id', id)
    .select()

  if (error) {
    throw new Error(`Failed to update player: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`Player with ID ${id} not found`)
  }

  if (data.length > 1) {
    throw new Error(`Multiple players found with ID ${id}`)
  }

  return data[0]
}

/**
 * Delete a player
 * 
 * @param id - Player ID to delete
 */
export async function deletePlayer(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete player: ${error.message}`)
  }
}

/**
 * Get all teams a player belongs to
 * 
 * @param playerId - Player ID
 * @returns Array of teams
 */
export async function getPlayerTeams(playerId: string): Promise<Team[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('team_players')
    .select('teams(*)')
    .eq('player_id', playerId)

  if (error) {
    throw new Error(`Failed to fetch player teams: ${error.message}`)
  }

  // Extract teams from the nested structure
  return (data || []).map((item: any) => item.teams).filter(Boolean)
}

export async function getTeamPlayers(teamId: string): Promise<Player[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('team_players')
    .select('players(*)')
    .eq('team_id', teamId)

  if (error) {
    throw new Error(`Failed to fetch team players: ${error.message}`)
  }

  // Extract players from the nested structure
  return (data || []).map((item: any) => item.players).filter(Boolean)
}

/**
 * Get player count for a specific coach
 * 
 * @param coachId - Coach's user ID
 * @returns Number of players
 */
export async function getPlayerCountByCoachId(coachId: string): Promise<number> {
  const supabase = createServerSupabaseClient()

  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)

  if (error) {
    throw new Error(`Failed to count players: ${error.message}`)
  }

  return count || 0
}

/**
 * Get all players with their assigned teams
 * 
 * @param coachId - Coach's user ID
 * @returns Array of players with teams
 */
export async function getPlayersWithTeams(coachId: string): Promise<any[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .select(`
      *,
      team_players(
        teams(*)
      )
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch players with teams: ${error.message}`)
  }

  // Transform the data to include teams array
  return (data || []).map((player: any) => ({
    ...player,
    teams: player.team_players?.map((tp: any) => tp.teams).filter(Boolean) || [],
    team_players: undefined, // Remove nested structure
  }))
}

/**
 * Search players by name
 * 
 * @param query - Search query string
 * @param limit - Max number of results (default 10)
 * @returns Array of matching players
 */
export async function searchPlayers(query: string, limit = 10): Promise<Player[]> {
  const supabase = createServerSupabaseClient()

  if (!query || query.trim().length === 0) return []

  // Basic search on first or last name
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(limit)

  if (error) {
    throw new Error(`Failed to search players: ${error.message}`)
  }

  return data || []
}