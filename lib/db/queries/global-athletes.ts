/**
 * Global Athlete Registry — Database Queries
 *
 * Supports the athlete deduplication strategy. These functions are used by
 * the organizer Merge UI to:
 *   1. Surface candidate player rows that likely represent the same person.
 *   2. Confirm merges by setting `players.global_athlete_id`.
 *   3. Read global athlete stats for cross-tournament analytics.
 *
 * All writes go through the server Supabase client (respects RLS).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export interface DedupCandidate {
  normFirst: string
  normLast: string
  dateOfBirth: string | null
  playerCount: number
  playerIds: string[]
}

export interface GlobalAthlete {
  id: string
  canonicalFirstName: string
  canonicalLastName: string
  dateOfBirth: string | null
  gender: string | null
  totalTournaments: number
  totalGold: number
  totalSilver: number
  totalBronze: number
  createdAt: string
}

export interface PlayerWithTeam {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  beltLevel: string | null
  globalAthleteId: string | null
  teamName: string | null
  coachName: string | null
}

/**
 * Fetch groups of unlinked player rows that share the same normalised
 * (first_name, last_name, date_of_birth). Used to populate the merge UI.
 *
 * @returns Up to 100 candidate groups, ordered by player_count desc.
 */
export async function getDedupCandidates(): Promise<DedupCandidate[]> {
  const supabase = await createServerSupabaseClient()

  // Query the dedup_candidates view created in migration 050
  const { data, error } = await supabase
    .from('dedup_candidates' as any)
    .select('norm_first, norm_last, date_of_birth, player_count, player_ids')
    .order('player_count', { ascending: false })
    .limit(100)

  if (error) {
    throw new Error(`Failed to fetch dedup candidates: ${error.message}`)
  }

  return (data ?? []).map((row: any) => ({
    normFirst: row.norm_first,
    normLast: row.norm_last,
    dateOfBirth: row.date_of_birth,
    playerCount: row.player_count,
    playerIds: row.player_ids,
  }))
}

/**
 * Fetch player details for a list of player IDs, including their team and
 * coach name (from the latest tournament registration, if any).
 */
export async function getPlayersByIds(playerIds: string[]): Promise<PlayerWithTeam[]> {
  if (playerIds.length === 0) return []

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      date_of_birth,
      belt_level,
      global_athlete_id,
      tournament_registrations (
        teams ( name ),
        coach:users!tournament_registrations_coach_id_fkey ( full_name )
      )
    `)
    .in('id', playerIds)

  if (error) {
    throw new Error(`Failed to fetch players: ${error.message}`)
  }

  return (data ?? []).map((p: any) => {
    // Use the first registration found for team/coach info
    const reg = p.tournament_registrations?.[0]
    return {
      id: p.id,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      dateOfBirth: p.date_of_birth,
      beltLevel: p.belt_level,
      globalAthleteId: p.global_athlete_id,
      teamName: reg?.teams?.name ?? null,
      coachName: reg?.coach?.full_name ?? null,
    }
  })
}

/**
 * Create a new global athlete record and link the provided player IDs to it.
 * Also inserts rows in `athlete_merge_log` for auditability.
 *
 * @param canonicalFirstName - Confirmed canonical first name
 * @param canonicalLastName  - Confirmed canonical last name
 * @param dateOfBirth        - ISO date string (YYYY-MM-DD)
 * @param gender             - Optional gender string
 * @param playerIds          - Player rows to link to this global record
 * @param mergedBy           - Clerk user ID of the organizer performing the merge
 * @param notes              - Optional notes for the merge log
 * @returns The newly created GlobalAthlete record
 */
export async function mergePlayersIntoGlobalAthlete(
  canonicalFirstName: string,
  canonicalLastName: string,
  dateOfBirth: string | null,
  gender: string | null,
  playerIds: string[],
  mergedBy: string,
  notes?: string
): Promise<GlobalAthlete> {
  const supabase = await createServerSupabaseClient()

  // 1. Create global athlete record
  const { data: athleteData, error: athleteError } = await supabase
    .from('global_athletes' as any)
    .insert({
      canonical_first_name: canonicalFirstName,
      canonical_last_name: canonicalLastName,
      date_of_birth: dateOfBirth,
      gender,
      created_by: mergedBy,
    })
    .select()
    .single()

  if (athleteError || !athleteData) {
    throw new Error(`Failed to create global athlete: ${athleteError?.message}`)
  }

  const globalAthleteId = (athleteData as any).id

  // 2. Link player rows
  const { error: linkError } = await supabase
    .from('players')
    .update({ global_athlete_id: globalAthleteId } as any)
    .in('id', playerIds)

  if (linkError) {
    throw new Error(`Failed to link players to global athlete: ${linkError.message}`)
  }

  // 3. Insert merge log entries
  const logEntries = playerIds.map(playerId => ({
    global_athlete_id: globalAthleteId,
    player_id: playerId,
    merged_by: mergedBy,
    notes: notes ?? null,
  }))

  const { error: logError } = await supabase
    .from('athlete_merge_log' as any)
    .insert(logEntries)

  if (logError) {
    // Non-fatal — log but don't throw
    logger.error({ details: logError.message }, 'Failed to insert merge log entries')
  }

  return {
    id: globalAthleteId,
    canonicalFirstName: (athleteData as any).canonical_first_name,
    canonicalLastName: (athleteData as any).canonical_last_name,
    dateOfBirth: (athleteData as any).date_of_birth,
    gender: (athleteData as any).gender,
    totalTournaments: 0,
    totalGold: 0,
    totalSilver: 0,
    totalBronze: 0,
    createdAt: (athleteData as any).created_at,
  }
}

/**
 * Unlink a player from their global athlete record (undo a mistaken merge).
 */
export async function unlinkPlayerFromGlobalAthlete(playerId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('players')
    .update({ global_athlete_id: null } as any)
    .eq('id', playerId)

  if (error) {
    throw new Error(`Failed to unlink player: ${error.message}`)
  }
}

/**
 * Fetch all global athlete records with their linked player count.
 * Used by the analytics / leaderboard views.
 *
 * @param limit - Max records to return (default 50)
 * @param offset - Pagination offset (default 0)
 */
export async function getGlobalAthletes(
  limit = 50,
  offset = 0
): Promise<GlobalAthlete[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('global_athletes' as any)
    .select('*')
    .order('total_gold', { ascending: false })
    .order('total_silver', { ascending: false })
    .order('total_bronze', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch global athletes: ${error.message}`)
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    canonicalFirstName: row.canonical_first_name,
    canonicalLastName: row.canonical_last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    totalTournaments: row.total_tournaments,
    totalGold: row.total_gold,
    totalSilver: row.total_silver,
    totalBronze: row.total_bronze,
    createdAt: row.created_at,
  }))
}
