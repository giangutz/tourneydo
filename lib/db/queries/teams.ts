/**
 * Team database queries
 * 
 * Centralized data access layer for team operations.
 * All queries are properly typed and handle errors consistently.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Team, TeamInsert, TeamUpdate, TeamWithPlayerCount, TeamPlayerInsert } from '@/types/models'
import { createClerkSupabaseClient } from '../client'

/**
 * Get all teams for a specific user (coach)
 * 
 * @param userId - User ID (coach)
 * @returns Array of teams
 */
export async function getTeamsByUserId(userId: string): Promise<Team[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`)
  }

  return data || []
}

/**
 * Get teams with player count
 * 
 * @param userId - User ID (coach)
 * @returns Array of teams with player counts
 */
export async function getTeamsWithPlayerCount(userId: string): Promise<TeamWithPlayerCount[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_players(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`)
  }

  // Transform the data to include player_count
  return (data || []).map((team: any) => ({
    ...team,
    player_count: team.team_players?.[0]?.count || 0,
    team_players: undefined, // Remove the nested structure
  }))
}

/**
 * Get a single team by ID
 * 
 * @param id - Team ID
 * @returns Team object or null if not found
 */
export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch team: ${error.message}`)
  }

  return data
}

/**
 * Create a new team
 * 
 * @param teamData - Team data to insert
 * @returns Created team object
 */
export async function createTeam(teamData: TeamInsert): Promise<Team> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .insert(teamData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create team: ${error.message}`)
  }

  return data
}

/**
 * Update an existing team
 * 
 * @param id - Team ID to update
 * @param teamData - Partial team data to update
 * @returns Updated team object
 */
export async function updateTeam(id: string, teamData: TeamUpdate): Promise<Team> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .update(teamData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update team: ${error.message}`)
  }

  return data
}

/**
 * Delete a team
 * 
 * @param id - Team ID to delete
 */
export async function deleteTeam(id: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete team: ${error.message}`)
  }
}

/**
 * Add a player to a team
 * 
 * @param teamId - Team ID
 * @param playerId - Player ID
 */
export async function addPlayerToTeam(teamId: string, playerId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const teamPlayerData: TeamPlayerInsert = {
    team_id: teamId,
    player_id: playerId,
  }

  const { error } = await supabase
    .from('team_players')
    .insert(teamPlayerData)

  if (error) {
    throw new Error(`Failed to add player to team: ${error.message}`)
  }
}

/**
 * Remove a player from a team
 * 
 * @param teamId - Team ID
 * @param playerId - Player ID
 */
export async function removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('team_players')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId)

  if (error) {
    throw new Error(`Failed to remove player from team: ${error.message}`)
  }
}

/**
 * Add multiple players to a team at once
 * 
 * @param teamId - Team ID
 * @param playerIds - Array of player IDs
 */
export async function addPlayersToTeam(teamId: string, playerIds: string[]): Promise<void> {
  const supabase = createServerSupabaseClient()

  const teamPlayerData: TeamPlayerInsert[] = playerIds.map(playerId => ({
    team_id: teamId,
    player_id: playerId,
  }))

  const { error } = await supabase
    .from('team_players')
    .insert(teamPlayerData)

  if (error) {
    throw new Error(`Failed to add players to team: ${error.message}`)
  }
}

/**
 * Get a team with all its players
 * 
 * @param teamId - Team ID
 * @returns Team with players array
 */
export async function getTeamWithPlayers(teamId: string): Promise<any> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_players(
        players(*)
      )
    `)
    .eq('id', teamId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch team with players: ${error.message}`)
  }

  // Transform the data to include players array
  return {
    ...data,
    players: data.team_players?.map((tp: any) => tp.players).filter(Boolean) || [],
    team_players: undefined, // Remove nested structure
  }
}
