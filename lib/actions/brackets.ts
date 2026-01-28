'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { saveBracket } from '@/lib/db/queries/matches'
import { generateBracket } from '@/lib/utils/bracket-generator'
import { getTournamentDivisions, assignParticipantDivision } from '@/lib/db/queries/divisions'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { calculateAge, findDivisionByAge, findCategory } from '@/lib/constants/divisions'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import { id } from 'zod/v4/locales'
import { getBeltSkillCategory } from '@/lib/utils'

/**
 * Generate and save bracket for a tournament
 */
// Custom result type for bracket generation with validation details
export type GenerateBracketResult =
  | { success: true }
  | {
    success: false;
    error: string;
    errorType?: 'unweighed' | 'unassigned' | 'general' | 'invalid_belt';
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

    // 2. Fetch tournament divisions (relying on existing configuration)
    const allDivisions = await getTournamentDivisions(tournamentId) as any

    // Filter to only enabled divisions
    const divisions = allDivisions.filter((d: any) => d.enabled !== false)

    if (divisions.length === 0) {
      return { success: false, error: 'No divisions are enabled for this tournament. Please enable at least one division in Division Management.', errorType: 'general' }
    }

    // 3. Fetch participants
    const { data: participants } = await getTournamentParticipants(tournamentId, { limit: 1000 })

    const confirmedParticipants = participants.filter((p: any) => (p.status === 'verified' || p.status === 'paid') && !p.disqualified)

    if (confirmedParticipants.length < 2) {
      return { success: false, error: 'Need at least 2 verified/paid participants to generate brackets', errorType: 'general' }
    }

    // 3.5. Validate all confirmed participants have completed weigh-in
    const participantsWithoutWeighIn = confirmedParticipants.filter((p: any) => {
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
        participants: participantsWithoutWeighIn.map((p: any) => ({
          id: p.id,
          name: `${p.player?.first_name} ${p.player?.last_name}`,
          reason: 'Missing weigh-in data'
        }))
      }
    }

    // 3.8 Validate all confirmed participants have valid belt levels (for Standard tournaments)
    if (!isOpenBelt) {
      const participantsWithInvalidBelts = confirmedParticipants.filter((p: any) => {
        if (!p.player?.belt_level) return true // Missing belt entirely

        const belt = p.player.belt_level.toLowerCase()
        // Allowed: White, Yellow, Blue, Red, Brown, Black
        // (Includes variations like "High Yellow" if they contain the base color, 
        // but explicit checks for invalid ones like Green/Orange are needed if strict)

        const allowedColors = ['white', 'yellow', 'blue', 'red', 'brown', 'black']
        const hasValidColor = allowedColors.some(c => belt.includes(c))

        // Also ensure it doesn't contain forbidden colors if we want to be super strict?
        // User request: "only recognize W, Y, B, R, B, Black"
        // If someone has "Green Belt", hasValidColor is false. 
        // If someone has "Blue-Green", hasValidColor is true (Blue). 
        // Let's assume the user wants to ban purely non-standard belts.

        if (!hasValidColor) return true

        // Also check getBeltSkillCategory to ensure it maps to a valid group
        const skillCategory = getBeltSkillCategory(p.player.belt_level)
        return skillCategory === 'Unknown' || !skillCategory
      })

      if (participantsWithInvalidBelts.length > 0) {
        return {
          success: false,
          error: 'Some participants have invalid or unknown belt levels',
          errorType: 'invalid_belt',
          participants: participantsWithInvalidBelts.map((p: any) => ({
            id: p.id,
            name: `${p.player?.first_name} ${p.player?.last_name}`,
            reason: `Invalid belt: ${p.player?.belt_level || 'None'}`
          }))
        }
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

      // Map DB divisions to config shape for matching
      const divisionConfigs = divisions.map((d: any) => ({
        name: d.name,
        minAge: d.min_age,
        maxAge: d.max_age,
        categories: d.tournament_categories?.map((c: any) => ({
          name: c.name,
          gender: c.gender,
          minWeight: c.min_weight,
          maxWeight: c.max_weight,
          minHeight: c.min_height,
          maxHeight: c.max_height
        })) || []
      }))

      const division = findDivisionByAge(age, divisionConfigs)

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
          reason: `Division ${division.name} is not enabled for this tournament`
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
      (p: any) => (p.status === 'verified' || p.status === 'paid') && p.division_id && p.category_id && !p.disqualified
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

    // NOTE: Match numbering and scheduling is now done separately 
    // via the "regenerate schedule" action


    // Revalidate paths to prevent caching of bracket data
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(`/tournaments/${tournamentId}`)

    return { success: true }
  } catch (error) {
    console.error('Error in generateTournamentBracket:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      errorType: 'general'
    }
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
