/**
 * Athlete Readiness Database Queries
 * 
 * Manages the operational gate for match start confirmation.
 * Does NOT affect scheduling, numbering, or dependencies.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  MatchAthleteReadiness,
  MatchWithReadiness,
  ReadinessStatus,
  Match
} from '@/types/models'
import { transformMatch } from './matches'
import { CourtStatus } from '@/lib/utils/match-lifecycle'

/**
 * Get readiness status for a specific match
 */
export async function getMatchReadiness(matchId: string): Promise<{
  athlete1Called: boolean
  athlete2Called: boolean
}> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .rpc('get_match_readiness_status', { p_match_id: matchId })
    .single()

  if (error) {
    console.error('Failed to get match readiness:', error)
    return { athlete1Called: false, athlete2Called: false }
  }

  return {
    athlete1Called: data?.athlete1_called ?? false,
    athlete2Called: data?.athlete2_called ?? false
  }
}

/**
 * Toggle athlete called status
 */
export async function toggleAthleteReadiness(
  matchId: string,
  athleteId: string,
  called: boolean,
  calledBy: string
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Validate inputs
  if (!matchId || !athleteId) {
    throw new Error('Match ID and Athlete ID are required')
  }

  // Upsert readiness record
  const { error } = await supabase
    .from('match_athlete_readiness')
    .upsert({
      match_id: matchId,
      athlete_id: athleteId,
      called,
      called_at: called ? new Date().toISOString() : null,
      called_by: called ? calledBy : null
    }, {
      onConflict: 'match_id,athlete_id'
    })

  if (error) {
    throw new Error(`Failed to toggle athlete readiness: ${error.message}`)
  }
}

/**
 * Get all readiness records for a match
 */
export async function getMatchReadinessRecords(
  matchId: string
): Promise<MatchAthleteReadiness[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('match_athlete_readiness')
    .select('*')
    .eq('match_id', matchId)

  if (error) {
    throw new Error(`Failed to get readiness records: ${error.message}`)
  }

  return data || []
}

/**
 * Get matches with readiness status for bracket display
 */
export async function getMatchesWithReadiness(
  tournamentId: string
): Promise<MatchWithReadiness[]> {
  const supabase = createServerSupabaseClient()

  // Get all matches for tournament
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      match_rounds (
        round_number,
        score_player1,
        score_player2,
        winner_id
      ),
      tournament_divisions (
        id,
        name,
        min_age,
        max_age
      ),
      tournament_categories (
        id,
        name,
        gender
      ),
      player1:players!player1_id (
        id,
        first_name,
        last_name,
        belt_level
      ),
      player2:players!player2_id (
        id,
        first_name,
        last_name,
        belt_level
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })

  if (matchesError) {
    throw new Error(`Failed to get matches: ${matchesError.message}`)
  }

  if (!matches || matches.length === 0) {
    return []
  }

  // Get all readiness records for these matches
  const matchIds = matches.map(m => m.id)
  const { data: readinessRecords, error: readinessError } = await supabase
    .from('match_athlete_readiness')
    .select('*')
    .in('match_id', matchIds)

  if (readinessError) {
    console.error('Failed to get readiness records:', readinessError)
  }

  // Build readiness map
  const readinessMap = new Map<string, Map<string, boolean>>()
  for (const record of readinessRecords || []) {
    if (!readinessMap.has(record.match_id)) {
      readinessMap.set(record.match_id, new Map())
    }
    readinessMap.get(record.match_id)!.set(record.athlete_id, record.called)
  }

  // Combine matches with readiness
  return matches.map(m => {
    const match = transformMatch(m)
    const matchReadiness = readinessMap.get(match.id)

    // Safely get readiness status with proper null checks
    const athlete1_called = match.player1_id
      ? (matchReadiness?.get(match.player1_id) ?? false)
      : false
    const athlete2_called = match.player2_id
      ? (matchReadiness?.get(match.player2_id) ?? false)
      : false

    return {
      ...match,
      athlete1_called,
      athlete2_called
    } as MatchWithReadiness
  })
}

/**
 * Initialize readiness records for a match when players are assigned
 */
export async function initializeMatchReadiness(matchId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  if (!matchId) {
    console.error('Cannot initialize match readiness: matchId is required')
    return
  }

  const { error } = await supabase.rpc('initialize_match_readiness', {
    p_match_id: matchId
  })

  if (error) {
    console.error('Failed to initialize match readiness:', error)
  }
}

/**
 * Compute full readiness status including all blocking conditions
 * This combines readiness with dependency/recovery/court checks
 */
export async function computeMatchReadinessStatus(
  match: Match,
  allMatches: Match[],
  courtStatus: Map<number, CourtStatus>
): Promise<ReadinessStatus> {
  const blockedReasons: string[] = []

  // Get readiness status
  const readiness = await getMatchReadiness(match.id)

  // 1. Check lifecycle state
  if (match.lifecycle_state !== 'CONTEST') {
    blockedReasons.push(`Match is in ${match.lifecycle_state} state, not CONTEST`)
  }

  // 2. Check athlete readiness
  if (!readiness.athlete1Called && match.player1_id) {
    blockedReasons.push('Waiting for Athlete 1 to be called')
  }
  if (!readiness.athlete2Called && match.player2_id) {
    blockedReasons.push('Waiting for Athlete 2 to be called')
  }

  // 3. Check source match dependencies
  const sourceMatches = allMatches.filter(m =>
    match.source_match_ids?.includes(m.id)
  )
  const incompleteSourceIds = sourceMatches
    .filter(sm => sm.lifecycle_state !== 'COMPLETED' && sm.lifecycle_state !== 'AUTO_ADVANCE')
    .map(sm => sm.id)

  if (incompleteSourceIds.length > 0) {
    blockedReasons.push(`Waiting for ${incompleteSourceIds.length} source match(es) to complete`)
  }

  // 4. Check if both athletes are known
  if (match.player1_id === null) {
    blockedReasons.push('Player 1 not yet determined')
  }
  if (match.player2_id === null) {
    blockedReasons.push('Player 2 not yet determined')
  }

  // 5. Check athlete recovery time
  const currentTime = new Date()
  if (match.athlete1_available_at) {
    const availableTime = new Date(match.athlete1_available_at)
    if (currentTime < availableTime) {
      const waitMins = Math.ceil((availableTime.getTime() - currentTime.getTime()) / 60000)
      blockedReasons.push(`Player 1 needs ${waitMins} more minutes of recovery`)
    }
  }

  if (match.athlete2_available_at) {
    const availableTime = new Date(match.athlete2_available_at)
    if (currentTime < availableTime) {
      const waitMins = Math.ceil((availableTime.getTime() - currentTime.getTime()) / 60000)
      blockedReasons.push(`Player 2 needs ${waitMins} more minutes of recovery`)
    }
  }

  // 6. Check court availability
  if (match.court_number !== null) {
    const court = courtStatus.get(match.court_number)
    if (court && court.isOccupied) {
      blockedReasons.push(`Court ${match.court_number} is occupied`)
    }
  }

  return {
    athlete1Called: readiness.athlete1Called,
    athlete2Called: readiness.athlete2Called,
    bothReady: readiness.athlete1Called && readiness.athlete2Called,
    canStart: blockedReasons.length === 0,
    blockedReasons
  }
}
