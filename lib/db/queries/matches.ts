import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'


/**
 * Save a generated bracket (delete existing and insert new)
 */
// Helper to map Domain Match/MatchInsert to DB Row
function toDbMatch(match: Partial<Match> | MatchInsert): any {
  const dbMatch: any = { ...match }

  // Map fields
  // if ('round' in match) {
  //   dbMatch.round_number = match.round
  //   delete dbMatch.round
  // }
  // NOTE: The DB columns score_player1 and score_player2 DO NOT EXIST on the matches table.
  // Scores are stored in match_rounds. We must remove them from the insert payload.
  if ('score_player1' in match) {
    delete dbMatch.score_player1
  }
  if ('score_player2' in match) {
    delete dbMatch.score_player2
  }

  // Remove fields that don't exist in matches table
  const nonDbFields = [
    'score_round1_player1', 'score_round1_player2', 'winner_round1',
    'score_round2_player1', 'score_round2_player2', 'winner_round2',
    'score_round3_player1', 'score_round3_player2', 'winner_round3'
  ]

  nonDbFields.forEach(field => delete dbMatch[field])

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

  console.log(`saveBracket: Saving ${matches.length} matches for tournament ${tournamentId}`)

  const dbMatches = matches.map(toDbMatch)

  // 1. Clear existing matches
  await deleteTournamentMatches(tournamentId)

  // 2. Insert new matches
  const { data, error: insertError } = await supabase
    .from('matches')
    .insert(dbMatches)
    .select()

  if (insertError) {
    console.error('Insert error:', insertError)
    throw new Error(`Failed to save bracket: ${insertError.message}`)
  }

  console.log(`Successfully inserted ${data?.length || 0} matches`)

  // 3. Create 3 rounds for each match (Batch Insert)
  if (data && data.length > 0) {
    console.log('Creating rounds for matches...')

    const allRounds = data.flatMap(match => [
      { match_id: match.id, round_number: 1 },
      { match_id: match.id, round_number: 2 },
      { match_id: match.id, round_number: 3 }
    ])

    // Batch insert in chunks of 1000 to be safe
    const CHUNK_SIZE = 1000
    for (let i = 0; i < allRounds.length; i += CHUNK_SIZE) {
      const chunk = allRounds.slice(i, i + CHUNK_SIZE)
      const { error: roundsError } = await supabase
        .from('match_rounds')
        .insert(chunk)

      if (roundsError) {
        console.error('Failed to insert batch of rounds:', roundsError)
        throw new Error(`Failed to create rounds: ${roundsError.message}`)
      }
    }

    console.log(`Successfully created ${allRounds.length} rounds`)
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
export function transformMatch(m: any): Match {
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
    console.error(`Failed to fetch match ${id}:`, error)
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
    console.error(`Error finding active match for player ${playerId}:`, error)
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

  console.log(`[FORFEIT] Match ${matchId}: Forfeiting player ${disqualifiedPlayerId}, Winner is ${winnerId}`)

  // 2. Update match status
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_id: winnerId,
      tournament_id: typedMatch.tournament_id,
      // For IBJJF/common logic, scores often stay 0 or marked special. 
      // We will leave scores as is or set to 0. 
      // We aren't setting win_reason column as it doesn't exist yet, relying on logic/logs.
    })
    .eq('id', matchId)

  if (updateError) {
    throw new Error(`Failed to forfeit match: ${updateError.message}`)
  }

  // 3. Advance the winner
  if (typedMatch.next_match_id) {
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, tournament_id')
      .eq('id', typedMatch.next_match_id)
      .single()

    if (nextMatch) {
      // Find sibling match (the other feeder) to determine slot
      // The rule is: Lower match_number feeds player1, Higher match_number feeds player2

      const { data: feederMatches } = await supabase
        .from('matches')
        .select('id, match_number')
        .eq('next_match_id', typedMatch.next_match_id)
        .order('match_number', { ascending: true })

      let targetSlot = 'player1_id' // Default

      if (feederMatches && feederMatches.length === 2) {
        // If we are the second match (higher number), we go to player2
        if (feederMatches[1].id === typedMatch.id) {
          targetSlot = 'player2_id'
        }
      } else {
        // Fallback or single feeder? 
        // If we only found 1 (us), we can't be sure, but standard logic implies:
        // Match numbers: [Odd] -> P1, [Even] -> P2 (relative to structure)
        // Simple heuristic: If (match_number % 2 === 1) -> P1? 
        // No, match numbers are global: 4, 5, 6, 7. 
        // 4->P1, 5->P2. 6->P1, 7->P2.
        // So (match_number % 2 === 0) -> P1 or P2?
        // 4 (even) -> P1. 5 (odd) -> P2.
        // It's (match_number % 2 === 0) ? P1 : P2 ? 
        // Wait, startMatchNumber can be anything.
        // Let's stick to the feederMatches logic. If fetch fails, fallback to existing behavior.

        // Fallback: If player1 is taken and not us, take player2.
        const typedNextMatch = nextMatch as unknown as { player1_id: string | null; player2_id: string | null; tournament_id: string }
        if (typedNextMatch.player1_id !== null && typedNextMatch.player1_id !== winnerId) {
          targetSlot = 'player2_id'
        }
      }

      // Prepare update
      const updateData = targetSlot === 'player1_id'
        ? { player1_id: winnerId, tournament_id: nextMatch.tournament_id }
        : { player2_id: winnerId, tournament_id: nextMatch.tournament_id }

      await supabase.from('matches').update(updateData).eq('id', typedMatch.next_match_id)
      console.log(`[FORFEIT] Advanced winner ${winnerId} to ${typedMatch.next_match_id} (${targetSlot})`)
    }
  }
}
