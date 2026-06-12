import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'
import { logger } from '@/lib/logger'


/**
 * Save a generated bracket (delete existing and insert new)
 */
/**
 * Strip view-model fields that exist on Match (populated by transformMatch from match_rounds)
 * but have no corresponding column on the matches table.
 * score_player1/2 live on match_rounds; score_roundN_* and winner_roundN are computed joins.
 */
function toDbMatch(match: Partial<Match> | MatchInsert): Record<string, unknown> {
  const {
    score_player1, score_player2,
    score_round1_player1, score_round1_player2, winner_round1,
    score_round2_player1, score_round2_player2, winner_round2,
    score_round3_player1, score_round3_player2, winner_round3,
    ...dbMatch
  } = match as Record<string, unknown>
  // suppress unused-var warnings — these are intentionally excluded
  void score_player1; void score_player2
  void score_round1_player1; void score_round1_player2; void winner_round1
  void score_round2_player1; void score_round2_player2; void winner_round2
  void score_round3_player1; void score_round3_player2; void winner_round3
  return dbMatch
}

/**
 * Delete all matches for a tournament
 */
export async function deleteTournamentMatches(tournamentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)

  if (error) {
    throw new Error(`Failed to delete tournament matches: ${error.message}`)
  }
}

export async function saveBracket(tournamentId: string, matches: MatchInsert[]): Promise<void> {
  const supabase = createServerSupabaseClient()
  const dbMatches = matches.map(toDbMatch)

  // 1. Capture existing match IDs before making any changes.
  //    This enables insert-before-delete: if the insert fails, old data remains intact.
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
  const oldMatchIds = existing?.map((m: { id: string }) => m.id) || []

  // 2. Insert new matches (all have fresh UUIDs — no conflicts with existing rows).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: insertError } = await (supabase as any)
    .from('matches')
    .insert(dbMatches)
    .select()

  if (insertError) {
    // Old matches are still intact — no data loss.
    throw new Error(`Failed to save bracket: ${insertError.message}`)
  }

  // 3. Create 3 rounds for each new match (batch in chunks of 1000).
  if (data && data.length > 0) {
    const allRounds = data.flatMap((match: { id: string }) => [
      { match_id: match.id, round_number: 1 },
      { match_id: match.id, round_number: 2 },
      { match_id: match.id, round_number: 3 }
    ])

    const CHUNK_SIZE = 1000
    for (let i = 0; i < allRounds.length; i += CHUNK_SIZE) {
      const chunk = allRounds.slice(i, i + CHUNK_SIZE)
      const { error: roundsError } = await supabase
        .from('match_rounds')
        .insert(chunk)

      if (roundsError) {
        throw new Error(`Failed to create rounds: ${roundsError.message}`)
      }
    }
  }

  // 4. Delete old matches AFTER the insert succeeded.
  //    match_rounds for old matches cascade-delete via FK.
  if (oldMatchIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .in('id', oldMatchIds)

    if (deleteError) {
      // Non-fatal: new bracket is live, old matches are stale duplicates.
      // Log for manual cleanup but do not throw.
      logger.error({ error: deleteError }, 'Failed to delete old bracket matches (non-fatal)')
    }
  }
}

/**
 * Update a match
 */
export async function updateMatch(id: string, updates: MatchUpdate): Promise<Match> {
  const supabase = createServerSupabaseClient()

  const dbUpdates = toDbMatch(updates)

  const { data, error } = await supabase
    .from('matches')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`)
  }

  // We theoretically should transform result back to Match, but for now returning data (partial mismatch potentially)
  // To be safe, we should probably re-fetch using getTournamentMatches or apply same transform.
  // But getTournamentMatches returns array.
  // Let's just return what we have as any to satisfy type for now, relying on getTournamentMatches for view.
  return data as unknown as Match
}

/**
 * Advance a winner to the next match
 */
export async function advanceWinner(matchId: string, updates: Partial<Match>): Promise<void> {
  const supabase = createServerSupabaseClient()

  const dbUpdates = toDbMatch(updates)

  const { error } = await supabase
    .from('matches')
    .update(dbUpdates)
    .eq('id', matchId)

  if (error) {
    throw new Error(`Failed to advance winner: ${error.message}`)
  }
}

/**
 * Helper to transform DB match to Match interface
 */
export function transformMatch(m: Record<string, unknown>): Match {
  const rounds = m.match_rounds as any[] || []
  const r1 = rounds.find(r => r.round_number === 1)
  const r2 = rounds.find(r => r.round_number === 2)
  const r3 = rounds.find(r => r.round_number === 3)

  return {
    ...m,
    round: (m as any).round || m.round_number || 0,
    score_player1: (m as any).score_player1 || 0,
    score_player2: (m as any).score_player2 || 0,

    score_round1_player1: r1?.score_player1 || 0,
    score_round1_player2: r1?.score_player2 || 0,
    winner_round1: r1?.winner_id || null,

    score_round2_player1: r2?.score_player1 || 0,
    score_round2_player2: r2?.score_player2 || 0,
    winner_round2: r2?.winner_id || null,

    score_round3_player1: r3?.score_player1 || 0,
    score_round3_player2: r3?.score_player2 || 0,
    winner_round3: r3?.winner_id || null,

    court_number: (m as any).court_number || null,

    // Preserve joined player data for skill level determination
    player1: m.player1 || null,
    player2: m.player2 || null,
  } as unknown as Match
}

/**
 * Get a single match by ID with joined data
 */
export async function getMatchById(id: string): Promise<Match | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
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
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logger.error({ error, matchId: id }, 'Failed to fetch match')
    return null
  }

  if (!data) return null

  return transformMatch(data)
}

/**
 * Get all matches for a tournament
 */
export async function getTournamentMatches(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
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
    .order('match_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch matches: ${error.message}`)
  }

  return data?.map(m => transformMatch(m)) || []
}

/**
 * Lighter variant of getTournamentMatches for scheduling / clash-detection /
 * preview / timeline paths that never read per-round scores.
 *
 * Drops the `match_rounds` join (3 nested rows per match — ~22.5k rows for a
 * 7.5k-match tournament) while keeping the player/division/category joins the
 * scheduler and clash detector need. Returns the same Match[] shape; scores
 * default to 0 via transformMatch (harmless for these callers). Benefits from
 * idx_matches_tournament_round_number for the ORDER BY.
 */
export async function getMatchesForScheduling(tournamentId: string): Promise<Match[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
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
    .order('match_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch matches: ${error.message}`)
  }

  return data?.map(m => transformMatch(m)) || []
}

/**
 * Find active match for a participant (where they are player1 or player2)
 */
export async function findActiveMatchForParticipant(
  playerId: string,
  tournamentId: string
): Promise<{ id: string; player1_id: string | null; player2_id: string | null; status: string; next_match_id: string | null; tournament_id: string } | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .select('id, player1_id, player2_id, status, next_match_id, tournament_id')
    .eq('tournament_id', tournamentId)
    .or(`status.eq.pending,status.eq.in_progress,status.eq.scheduled`)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') { // Ignore "Row not found"
    logger.error({ error, playerId }, 'Error finding active match for player')
    return null
  }

  return data as { id: string; player1_id: string | null; player2_id: string | null; status: string; next_match_id: string | null; tournament_id: string } | null
}

/**
 * Forfeit a match due to disqualification
 */
export async function forfeitMatch(matchId: string, disqualifiedPlayerId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  // 1. Get match details to find opponent and match_number
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('id, match_number, player1_id, player2_id, next_match_id, tournament_id')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    throw new Error('Match not found')
  }

  // Type assertion needed because Supabase types don't properly narrow
  const typedMatch = match as unknown as { id: string; match_number: number; player1_id: string | null; player2_id: string | null; next_match_id: string | null; tournament_id: string }

  const winnerId = typedMatch.player1_id === disqualifiedPlayerId ? typedMatch.player2_id : typedMatch.player1_id

  if (!winnerId) {
    // If there is no opponent (e.g. empty bracket slot), just complete the match?
    // Or just leave it. Assuming actual match context here.
    return
  }

  // 2. Update match status — mark completed, free the court slot, and update lifecycle state
  // so both the court queue (uses status) and the bracket view (uses lifecycle_state) reflect the forfeit.
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      lifecycle_state: 'COMPLETED',
      winner_id: winnerId,
      court_number: null,   // free the court slot so it can be used by other matches
    })
    .eq('id', matchId)

  if (updateError) {
    throw new Error(`Failed to forfeit match: ${updateError.message}`)
  }

  // 3. Advance the winner
  if (typedMatch.next_match_id) {
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, source_match_ids, tournament_id')
      .eq('id', typedMatch.next_match_id)
      .single()

    if (nextMatch) {
      const typedNextMatch = nextMatch as unknown as {
        id: string
        player1_id: string | null
        player2_id: string | null
        source_match_ids: string[] | null
        tournament_id: string
      }

      // Prevent duplicate advancement
      if (typedNextMatch.player1_id !== winnerId && typedNextMatch.player2_id !== winnerId) {
        // Use source_match_ids ordering to determine correct slot.
        // source_match_ids[0] → player1, source_match_ids[1] → player2.
        const sourceIds: string[] = typedNextMatch.source_match_ids || []
        const sourceIndex = sourceIds.indexOf(typedMatch.id)
        const targetSlot = sourceIndex === 1 ? 'player2_id' : 'player1_id'

        const updateData = targetSlot === 'player1_id'
          ? { player1_id: winnerId }
          : { player2_id: winnerId }

        await supabase.from('matches').update(updateData).eq('id', typedMatch.next_match_id)

        // Check if next match is now ready (both players known)
        const updatedP1 = updateData.player1_id ?? typedNextMatch.player1_id
        const updatedP2 = updateData.player2_id ?? typedNextMatch.player2_id

        if (updatedP1 && updatedP2) {
          await supabase
            .from('matches')
            .update({ lifecycle_state: 'CONTEST' })
            .eq('id', typedMatch.next_match_id)
        }
      }
    }
  }
}
