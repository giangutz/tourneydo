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
export async function generateTournamentBracket(tournamentId: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
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
    console.log('Tournament type:', tournament.tournament_type, 'isOpenBelt:', isOpenBelt)

    // 2. Ensure tournament has divisions configured
    let divisions = await getTournamentDivisions(tournamentId)
    if (divisions.length === 0) {
      // Create default divisions if none exist
      await createDefaultDivisions(tournamentId, DEFAULT_DIVISIONS)
      divisions = await getTournamentDivisions(tournamentId)
    }

    // 3. Fetch participants
    const { data: participants } = await getTournamentParticipants(tournamentId, { limit: 1000 })
    console.log('Total participants:', participants.length)

    const confirmedParticipants = participants.filter(p => (p.status === 'verified' || p.status === 'paid') && !p.disqualified)
    console.log('Confirmed participants:', confirmedParticipants.length)
    console.log('Confirmed participant statuses:', confirmedParticipants.map(p => ({ id: p.id, status: p.status, disqualified: p.disqualified })))

    if (confirmedParticipants.length < 2) {
      throw new Error('Need at least 2 verified/paid participants to generate brackets')
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
      const names = participantsWithoutWeighIn.map(p => `${p.player?.first_name} ${p.player?.last_name}`).join(', ')
      throw new Error(`The following participants need to complete weigh-in before bracket generation: ${names}`)
    }

    // 4. Assign participants to divisions and categories
    for (const participant of confirmedParticipants) {
      console.log('Processing participant:', {
        id: participant.id,
        hasDOB: !!participant.player?.dob,
        hasGender: !!participant.player?.gender,
        gender: participant.player?.gender,
        weight: participant.player?.weight,
        height: participant.player?.height,
        beltLevel: participant.player?.belt_level
      })

      if (!participant.player?.dob || !participant.player?.gender) {
        console.warn(`Skipping participant ${participant.id}: missing DOB or gender`)
        continue
      }

      const age = calculateAge(participant.player.dob)
      const division = findDivisionByAge(age, DEFAULT_DIVISIONS)

      if (!division) {
        console.warn(`No division found for participant ${participant.id} with age ${age}`)
        continue
      }

      const category = findCategory(
        participant.player.gender as 'male' | 'female',
        participant.player.weight,
        participant.player.height,
        division.categories
      )

      if (!category) {
        console.warn(`No category found for participant ${participant.id}`)
        continue
      }

      // Find the division and category IDs from the database
      const dbDivision = divisions.find(d => d.name === division.name)
      if (!dbDivision) continue

      const dbCategory = dbDivision.tournament_categories?.find(
        (c: any) => c.name === category.name && c.gender === category.gender
      )
      if (!dbCategory) continue

      // Assign to database
      await assignParticipantDivision(participant.id, dbDivision.id, dbCategory.id)
    }

    // 5. Refresh participants with division assignments
    const { data: assignedParticipants } = await getTournamentParticipants(tournamentId, { limit: 1000 })

    console.log(`Total participants after assignment: ${assignedParticipants.length}`)
    console.log('Participant assignment status:', assignedParticipants.map(p => ({
      id: p.id,
      name: `${p.player?.first_name} ${p.player?.last_name}`,
      status: p.status,
      disqualified: p.disqualified,
      division_id: p.division_id,
      category_id: p.category_id,
      belt_level: p.player?.belt_level
    })))

    const participantsWithDivisions = assignedParticipants.filter(
      p => (p.status === 'verified' || p.status === 'paid') && p.division_id && p.category_id && !p.disqualified
    )

    const filteredOut = assignedParticipants.filter(
      p => !((p.status === 'verified' || p.status === 'paid') && p.division_id && p.category_id && !p.disqualified)
    )

    if (filteredOut.length > 0) {
      console.warn(`⚠️ ${filteredOut.length} participants filtered out:`, filteredOut.map(p => ({
        name: `${p.player?.first_name} ${p.player?.last_name}`,
        reason: !p.division_id ? 'No division_id' :
          !p.category_id ? 'No category_id' :
            p.disqualified ? 'Disqualified' :
              !(p.status === 'verified' || p.status === 'paid') ? `Status: ${p.status}` : 'Unknown'
      })))
    }

    console.log(`Participants with divisions: ${participantsWithDivisions.length}`)

    // 6. Group participants by division, category, and optionally belt skill category
    const groups = new Map<string, typeof participantsWithDivisions>()

    for (const participant of participantsWithDivisions) {
      // For Standard tournaments: group by division, category, AND skill category (combined belt levels)
      // For Open Belt tournaments: group by division and category ONLY (ignore belt level)
      let key: string
      if (isOpenBelt) {
        key = `${participant.division_id}_${participant.category_id}`
      } else {
        // Use skill category instead of raw belt level
        const skillCategory = getBeltSkillCategory(participant.player?.belt_level)
        key = `${participant.division_id}_${participant.category_id}_${skillCategory}`
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(participant)
    }

    console.log(`${isOpenBelt ? 'Open Belt' : 'Standard'} tournament - Division/Category${isOpenBelt ? '' : '/Skill Category'} groups:`, Array.from(groups.entries()).map(([key, participants]) => ({
      key,
      count: participants.length,
      participants: participants.map((p: any) => ({
        id: p.id,
        name: `${p.player?.first_name} ${p.player?.last_name}`,
        division_id: p.division_id,
        category_id: p.category_id,
        belt_level: p.player?.belt_level,
        skill_category: isOpenBelt ? 'N/A' : getBeltSkillCategory(p.player?.belt_level)
      }))
    })))

    // 7. Generate brackets for each group
    const allMatches: any[] = []
    let matchNumberCounter = 1

    for (const [groupKey, groupParticipants] of groups.entries()) {
      // Handle single-player divisions - they automatically win their division
      if (groupParticipants.length === 1) {
        console.log(`Single participant in group ${groupKey}: ${groupParticipants[0].player?.first_name} ${groupParticipants[0].player?.last_name} - automatic winner`)

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

      console.log(`Generating bracket for group ${groupKey} with ${groupParticipants.length} participants`)
      const matches = generateBracket(tournamentId, groupParticipants, matchNumberCounter)
      console.log(`Generated ${matches.length} matches for group ${groupKey}`)

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

    console.log(`Total matches to save: ${allMatches.length}`)

    if (allMatches.length === 0) {
      throw new Error('No brackets generated. Ensure participants have DOB, gender, weight/height.')
    }

    // Save all matches at once
    await saveBracket(tournamentId, allMatches)

    // Revalidate paths to prevent caching of bracket data
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(`/tournaments/${tournamentId}`)
  })
}
