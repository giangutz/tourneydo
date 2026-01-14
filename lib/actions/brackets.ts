'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { saveBracket } from '@/lib/db/queries/matches'
import { generateBracket } from '@/lib/utils/bracket-generator'
import { getTournamentDivisions, assignParticipantDivision, createDefaultDivisions } from '@/lib/db/queries/divisions'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { DEFAULT_DIVISIONS, calculateAge, findDivisionByAge, findCategory } from '@/lib/constants/divisions'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import { id } from 'zod/v4/locales'

/**
 * Map belt level to skill category for Standard tournaments
 * White → Beginner
 * Yellow, Blue → Novice I
 * Red, Brown → Novice II
 * Black → Advanced
 */
function getBeltSkillCategory(beltLevel: string | null | undefined): string {
  if (!beltLevel) return 'unknown'

  const belt = beltLevel.toLowerCase()

  if (belt === 'white') return 'beginner'
  if (belt === 'yellow' || belt === 'blue') return 'novice_i'
  if (belt === 'red' || belt === 'brown') return 'novice_ii'
  if (belt === 'black') return 'advanced'

  return 'unknown'
}

/**
 * Generate and save bracket for a tournament
 */
// Custom result type for bracket generation with validation details
export type GenerateBracketResult =
  | { success: true }
  | {
    success: false;
    error: string;
    errorType?: 'unweighed' | 'unassigned' | 'general';
    participants?: { id: string; name: string; reason?: string; currentWeight?: number; currentHeight?: number; age?: number }[]
  }

/**
 * Generate and save bracket for a tournament
 */
export async function generateTournamentBracket(tournamentId: string): Promise<GenerateBracketResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // 1. Fetch tournament to get tournament type
    const tournament = await getTournamentById(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }
    const isOpenBelt = tournament.tournament_type === 'open-belt'

    // 2. Ensure tournament has divisions configured
    // 2. Ensure tournament has divisions configured (and backfill any missing categories)
    const { ensureTournamentDivisionsAndCategories } = await import('@/lib/db/queries/divisions')
    await ensureTournamentDivisionsAndCategories(tournamentId, DEFAULT_DIVISIONS)
    const divisions = await getTournamentDivisions(tournamentId) as any

    // 3. Fetch participants
    const { data: participants } = await getTournamentParticipants(tournamentId, { limit: 1000 })

    const confirmedParticipants = participants.filter(p => (p.status === 'verified' || p.status === 'paid') && !p.disqualified)

    if (confirmedParticipants.length < 2) {
      return { success: false, error: 'Need at least 2 verified/paid participants to generate brackets', errorType: 'general' }
    }

    // 3.5. Validate all confirmed participants have completed weigh-in
    const participantsWithoutWeighIn = confirmedParticipants.filter(p => {
      // Check if weigh-in is completed
      if (!p.weighed_in_at) return true

      // Check if they have actual measurements based on age
      const age = p.player?.dob ? new Date().getFullYear() - new Date(p.player.dob).getFullYear() : null
      if (age === null) return true

      const isHeightBased = age < 12
      if (isHeightBased && !p.actual_height) return true
      if (!isHeightBased && !p.actual_weight) return true

      return false
    })

    if (participantsWithoutWeighIn.length > 0) {
      return {
        success: false,
        error: 'Some participants have not completed weigh-in',
        errorType: 'unweighed',
        participants: participantsWithoutWeighIn.map(p => ({
          id: p.id,
          name: `${p.player?.first_name} ${p.player?.last_name}`,
          reason: 'Missing weigh-in data'
        }))
      }
    }

    // 4. Assign participants to divisions and categories
    const assignmentErrors: { id: string; name: string; reason: string; currentWeight?: number; currentHeight?: number; age?: number }[] = []

    for (const participant of confirmedParticipants) {
      if (!participant.player?.dob || !participant.player?.gender) {
        assignmentErrors.push({
          id: participant.id,
          name: `${participant.player?.first_name} ${participant.player?.last_name}`,
          reason: 'Missing DOB or Gender'
        })
        continue
      }

      const age = calculateAge(participant.player.dob)
      const division = findDivisionByAge(age, DEFAULT_DIVISIONS)

      if (!division) {
        assignmentErrors.push({
          id: participant.id,
          name: `${participant.player?.first_name} ${participant.player?.last_name}`,
          reason: `No division found for age ${age}`
        })
        continue
      }

      const category = findCategory(
        participant.player.gender as 'male' | 'female',
        participant.player.weight,
        participant.player.height,
        division.categories
      )

      if (!category) {
        assignmentErrors.push({
          id: participant.id,
          name: `${participant.player?.first_name} ${participant.player?.last_name}`,
          reason: `No matching weight/height category`,
          currentWeight: participant.player?.weight || undefined,
          currentHeight: participant.player?.height || undefined,
          age: age
        })
        continue
      }

      // Find the division and category IDs from the database
      const dbDivision = divisions.find((d: any) => d.name === division.name)
      if (!dbDivision) {
        assignmentErrors.push({
          id: participant.id,
          name: `${participant.player?.first_name} ${participant.player?.last_name}`,
          reason: `Division ${division.name} not configured in tournament`
        })
        continue
      }

      const dbCategory = dbDivision.tournament_categories?.find(
        (c: any) => c.name.trim().toLowerCase() === category.name.trim().toLowerCase() && c.gender === category.gender
      )
      if (!dbCategory) {
        console.error(`Mismatch debug: Category '${category.name}' (gender: ${category.gender}) not found in DB division '${dbDivision.name}' categories:`, dbDivision.tournament_categories?.map((c: any) => `${c.name} (${c.gender})`))
        assignmentErrors.push({
          id: participant.id,
          name: `${participant.player?.first_name} ${participant.player?.last_name}`,
          reason: `Category ${category.name} not configured (found: ${division.name})`
        })
        continue
      }

      // Assign to database
      await assignParticipantDivision(participant.id, dbDivision.id, dbCategory.id)
    }

    // If there were any assignment errors, STOP and return them
    if (assignmentErrors.length > 0) {
      return {
        success: false,
        error: 'Some participants could not be assigned to a division',
        errorType: 'unassigned',
        participants: assignmentErrors
      }
    }

    // 5. Refresh participants with division assignments
    const { data: assignedParticipants } = await getTournamentParticipants(tournamentId, { limit: 1000 })

    // Double check that everyone we expect to be assigned is actually assigned
    const participantsWithDivisions = assignedParticipants.filter(
      p => (p.status === 'verified' || p.status === 'paid') && p.division_id && p.category_id && !p.disqualified
    )

    // 6. Group participants by division, category, and optionally belt skill category
    const groups = new Map<string, typeof participantsWithDivisions>()

    for (const participant of participantsWithDivisions) {
      // For Standard tournaments: group by division, category, AND skill category (combined belt levels)
      // For Open Belt tournaments: group by division and category ONLY (ignore belt level)
      let key: string
      if (isOpenBelt) {
        key = `${participant.division_id}_${participant.category_id}`
      } else {
        // Standard: Use skill category to separate brackets (Beginner, Novice I, etc.)
        const skillCategory = getBeltSkillCategory(participant.player?.belt_level)
        key = `${participant.division_id}_${participant.category_id}_${skillCategory}`
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(participant)
    }

    // 7. Generate brackets for each group
    const allMatches: any[] = []
    let matchNumberCounter = 1

    for (const [groupKey, groupParticipants] of groups.entries()) {
      // Handle single-player divisions - they automatically win their division
      if (groupParticipants.length === 1) {
        // Create a single "finals" match where the participant is already the winner
        const divisionId = groupParticipants[0].division_id
        const categoryId = groupParticipants[0].category_id

        const singlePlayerMatch = {
          id: crypto.randomUUID(),
          tournament_id: tournamentId,
          round: 1,
          match_number: matchNumberCounter++,
          player1_id: groupParticipants[0].player_id,
          player2_id: null,
          winner_id: groupParticipants[0].player_id,
          score_player1: 0,
          score_player2: 0,
          score_round1_player1: 0,
          score_round1_player2: 0,
          score_round2_player1: 0,
          score_round2_player2: 0,
          score_round3_player1: 0,
          score_round3_player2: 0,
          status: 'completed' as const,
          next_match_id: null,
          source_match_id: null,
          court_number: null,
          division_id: divisionId,
          category_id: categoryId
        }

        allMatches.push(singlePlayerMatch)
        continue
      }

      const matches = generateBracket(tournamentId, groupParticipants, matchNumberCounter)

      // Update counter for next group
      matchNumberCounter += matches.length

      // Add division and category info to matches for display
      const divisionId = groupParticipants[0].division_id
      const categoryId = groupParticipants[0].category_id

      // Add metadata to each match
      const matchesWithMeta = matches.map(m => ({
        ...m,
        division_id: divisionId,
        category_id: categoryId
      }))

      allMatches.push(...matchesWithMeta)
    }

    if (allMatches.length === 0) {
      throw new Error('No brackets generated. Ensure participants have DOB, gender, weight/height.')
    }

    // Save all matches at once
    await saveBracket(tournamentId, allMatches)

    // Revalidate paths to prevent caching of bracket data
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(`/tournaments/${tournamentId}`)

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred', errorType: 'general' }
  }
}

/**
 * Delete tournament bracket (remove all matches)
 */
export async function deleteTournamentBracket(tournamentId: string): Promise<ActionResult> {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { deleteTournamentMatches } = await import('@/lib/db/queries/matches')
    await deleteTournamentMatches(tournamentId)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete bracket' }
  }
}
