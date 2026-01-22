'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { updateRegistrationStatus as updateRegistrationStatusQuery } from '@/lib/db/queries/registrations'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'

/**
 * Update participant registration status
 */
export async function updateParticipantStatus(
  registrationId: string,
  tournamentId: string,
  status: 'pending' | 'verified' | 'paid'
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await updateRegistrationStatusQuery(registrationId, { status })

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

import { z } from 'zod'
import { createPlayer, updatePlayer } from '@/lib/db/queries/players'
import { addPlayerToTeam, getTeamById } from '@/lib/db/queries/teams'
import { createRegistration } from '@/lib/db/queries/registrations'

const addParticipantSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  teamId: z.string().min(1, 'Team is required'),
  beltLevel: z.enum(['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'], {
    message: 'Belt level is required'
  }),
  weight: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], {
    message: 'Gender is required'
  }),
}).refine((data) => {
  const age = new Date().getFullYear() - new Date(data.dob).getFullYear()
  if (age < 12) {
    return data.height !== undefined && data.height > 0
  } else {
    return data.weight !== undefined && data.weight > 0
  }
}, {
  message: 'Height is required for participants under 12, weight is required for 12 and older',
  path: ['weight']
})

const updateParticipantSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  beltLevel: z.enum(['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'], {
    message: 'Belt level is required'
  }),
  weight: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], {
    message: 'Gender is required'
  }),
}).refine((data) => {
  const age = new Date().getFullYear() - new Date(data.dob).getFullYear()
  if (age < 12) {
    return data.height !== undefined && data.height > 0
  } else {
    return data.weight !== undefined && data.weight > 0
  }
}, {
  message: 'Height is required for participants under 12, weight is required for 12 and older',
  path: ['weight']
})

export type ParticipantFormState = {
  error?: string
  fieldErrors?: {
    [key: string]: string[] | undefined
  }
  success?: boolean
}

export async function addParticipant(tournamentId: string, prevState: any, formData: FormData): Promise<ParticipantFormState> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const rawData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    teamId: formData.get('teamId'),
    beltLevel: formData.get('beltLevel'),
    weight: formData.get('weight'),
    height: formData.get('height'),
    dob: formData.get('dob'),
    gender: formData.get('gender'),
  }

  const validatedFields = addParticipantSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    // 1. Get Team to find Coach ID
    const team = await getTeamById(validatedFields.data.teamId)
    if (!team) throw new Error('Team not found')

    // 2. Create Player
    const player = await createPlayer({
      first_name: validatedFields.data.firstName,
      last_name: validatedFields.data.lastName,
      email: validatedFields.data.email,
      coach_id: team.user_id,
      belt_level: validatedFields.data.beltLevel as any,
      weight: validatedFields.data.weight ?? null,
      height: validatedFields.data.height ?? null,
      dob: validatedFields.data.dob,
      gender: validatedFields.data.gender,
    })

    // 3. Add Player to Team
    await addPlayerToTeam(team.id, player.id)

    // 4. Register for Tournament
    await createRegistration({
      tournament_id: tournamentId,
      team_id: team.id,
      player_id: player.id,
      coach_id: team.user_id,
      status: 'verified', // Auto-verified since organizer added them
      actual_weight: null,
      actual_height: null,
      disqualified: false,
      disqualification_reason: null,
      weighed_in_at: null,
      weighed_in_by: null,
      weigh_in_selected: false
    })

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateParticipant(
  playerId: string,
  tournamentId: string,
  prevState: any,
  formData: FormData
): Promise<ParticipantFormState> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const rawData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    beltLevel: formData.get('beltLevel'),
    weight: formData.get('weight'),
    height: formData.get('height'),
    dob: formData.get('dob'),
    gender: formData.get('gender'),
  }

  const validatedFields = updateParticipantSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  // VALIDATION: Check against tournament configuration
  try {
    const { getTournamentById } = await import('@/lib/db/queries/tournaments')
    const { BELT_GROUPS } = await import('@/lib/constants/belts')

    const tournament = await getTournamentById(tournamentId)
    if (tournament) {
      // 1. Gender check
      const genderPref = tournament.gender_preference
      const participantGender = validatedFields.data.gender

      if (genderPref === 'male' && participantGender === 'female') {
        return { error: 'This tournament is for Male participants only.' }
      }
      if (genderPref === 'female' && participantGender === 'male') {
        return { error: 'This tournament is for Female participants only.' }
      }

      // 2. Belt Level check
      if (tournament.allowed_belt_groups && tournament.allowed_belt_groups.length > 0) {
        const belts = validatedFields.data.beltLevel

        let playerGroup: string | undefined
        for (const [group, beltsInGroup] of Object.entries(BELT_GROUPS)) {
          if (beltsInGroup.includes(belts)) {
            playerGroup = group
            break
          }
        }

        if (!playerGroup || !tournament.allowed_belt_groups.includes(playerGroup)) {
          return { error: `Belt level '${belts}' (${playerGroup}) is not allowed in this tournament.` }
        }
      }
    }
  } catch (err) {
    console.error('Validation check failed', err)
    return { error: 'Failed to validate tournament criteria.' }
  }

  try {
    await updatePlayer(playerId, {
      first_name: validatedFields.data.firstName,
      last_name: validatedFields.data.lastName,
      email: validatedFields.data.email,
      belt_level: validatedFields.data.beltLevel as any,
      weight: validatedFields.data.weight ?? null,
      height: validatedFields.data.height ?? null,
      dob: validatedFields.data.dob,
      gender: validatedFields.data.gender,
    })

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Weigh in a participant with actual measurements
 */
export async function weighInParticipant(
  registrationId: string,
  tournamentId: string,
  actualWeight: number | null,
  actualHeight: number | null
): Promise<ActionResult<{ needsAction: boolean; outOfRange?: 'above' | 'below'; exceededLimit?: 'weight' | 'height'; suggestedDivisions?: any[]; divisionMovePolicy?: 'allow_move' | 'disqualify_only' }>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Import here to avoid circular dependencies
    const { getRegistrationById, updateWeighIn } = await import('@/lib/db/queries/registrations')
    const { getTournamentDivisions } = await import('@/lib/db/queries/divisions')
    const { getTournamentDivisionPolicy } = await import('@/lib/db/queries/tournaments')
    const { validateWeightHeight, findAlternativeDivisions } = await import('@/lib/utils/weigh-in-validator')
    const { calculateAge } = await import('@/lib/constants/divisions')

    // Get tournament division policy
    const divisionMovePolicy = await getTournamentDivisionPolicy(tournamentId)

    // Get registration with player data
    const registration = await getRegistrationById(registrationId)

    if (registration.status !== 'verified') {
      throw new Error('Only verified participants can be weighed in. Please verify their payment first.')
    }

    if (!registration.player?.dob || !registration.player?.gender) {
      throw new Error('Player must have date of birth and gender')
    }

    // If participant is not yet assigned to a division, just save the measurements
    // Division assignment will happen later based on these measurements
    if (!registration.division_id || !registration.category_id) {
      await updateWeighIn(registrationId, actualWeight, actualHeight, userId)
      revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
      return { needsAction: false, divisionMovePolicy }
    }

    // Get tournament divisions to find the registered category
    const divisions = await getTournamentDivisions(tournamentId)
    const division = divisions.find(d => d.id === registration.division_id)

    if (!division) {
      throw new Error('Division not found')
    }

    const category: any = division.tournament_categories?.find((c: any) => c.id === registration.category_id)

    if (!category) {
      throw new Error('Category not found')
    }

    // Map tournament divisions to DivisionConfig format for validator
    const mappedDivisions = divisions.map(d => ({
      id: d.id,
      name: d.name,
      minAge: d.min_age,
      maxAge: d.max_age,
      categories: (d.tournament_categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        gender: c.gender as 'male' | 'female' | 'both',
        minWeight: c.min_weight,
        maxWeight: c.max_weight,
        minHeight: c.min_height,
        maxHeight: c.max_height
      }))
    }))

    // Calculate age
    const age = calculateAge(registration.player.dob)

    // Validate against registered category limits
    console.log('[DEBUG] Validating:', {
      actualWeight,
      actualHeight,
      categoryName: category.name,
      categoryId: category.id,
      minWeight: category.min_weight,
      maxWeight: category.max_weight,
      age,
      isHeightBased: age < 12
    })

    const validation = validateWeightHeight(
      actualWeight,
      actualHeight,
      {
        name: category.name,
        gender: category.gender,
        minWeight: category.min_weight,
        maxWeight: category.max_weight,
        minHeight: category.min_height,
        maxHeight: category.max_height
      },
      age
    )
    console.log('[DEBUG] Validation Result:', validation)

    // If within limits, save and return success
    if (validation.valid) {
      await updateWeighIn(registrationId, actualWeight, actualHeight, userId)
      revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
      return { needsAction: false, divisionMovePolicy }
    }

    // If out of range, find alternative divisions using dynamic configuration
    // Only if tournament policy allows division moves
    const suggestedDivisions = divisionMovePolicy === 'allow_move'
      ? findAlternativeDivisions(
        age,
        registration.player.gender as 'male' | 'female',
        actualWeight,
        actualHeight,
        validation.outOfRange!,
        validation.exceededLimit!,
        mappedDivisions as any // validator handles extra fields like 'id'
      )
      : []

    // Save the actual measurements even though they're out of range
    // This allows organizer to make a decision
    await updateWeighIn(registrationId, actualWeight, actualHeight, userId)
    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    return {
      needsAction: true,
      outOfRange: validation.outOfRange!,
      exceededLimit: validation.exceededLimit!,
      divisionMovePolicy,
      suggestedDivisions: suggestedDivisions.map(s => ({
        divisionName: s.division.name,
        divisionId: (s.division as any).id, // Pass DB ID
        categoryName: s.category.name,
        categoryGender: s.category.gender,
        reason: s.reason,
        categoryId: (s.category as any).id, // Pass DB ID
        minWeight: s.category.minWeight,
        maxWeight: s.category.maxWeight,
        minHeight: s.category.minHeight,
        maxHeight: s.category.maxHeight
      }))
    }
  })
}

/**
 * Move participant to a different division
 */
export async function moveParticipantDivision(
  registrationId: string,
  tournamentId: string,
  newDivisionId: string,
  newCategoryId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Check tournament division policy
    const { getTournamentDivisionPolicy } = await import('@/lib/db/queries/tournaments')
    const policy = await getTournamentDivisionPolicy(tournamentId)

    if (policy === 'disqualify_only') {
      throw new Error('This tournament does not allow division moves. Participants must be disqualified if out of range.')
    }

    const { updateDivisionAssignment } = await import('@/lib/db/queries/registrations')

    await updateDivisionAssignment(registrationId, newDivisionId, newCategoryId)

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
  })
}

/**
 * Disqualify a participant
 */
export async function disqualifyParticipant(
  registrationId: string,
  tournamentId: string,
  reason: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { updateDisqualification, getRegistrationById } = await import('@/lib/db/queries/registrations')
    const { findActiveMatchForParticipant, forfeitMatch } = await import('@/lib/db/queries/matches')

    // 1. Update DQ status in registration
    await updateDisqualification(registrationId, true, reason)

    // 2. Auto-forfeit active match
    try {
      const reg = await getRegistrationById(registrationId)
      if (reg.player_id) {
        // Find if they are in an active match
        const activeMatch = await findActiveMatchForParticipant(reg.player_id, tournamentId)

        if (activeMatch) {
          console.log(`[DQ AUTO-ACTION] Found active match ${activeMatch.id} for disqualified player ${reg.player_id}`)
          await forfeitMatch(activeMatch.id, reg.player_id)
        }
      }
    } catch (err) {
      console.error('[DQ AUTO-ACTION ERROR]', err)
      // We don't fail the whole action if forfeit fails, just log it. 
      // The participant is technically disqualified already in step 1.
    }

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
  })
}

/**
 * Allow participant at stated weight (keep in registered division despite being out of range)
 */
export async function allowAtStatedWeight(
  registrationId: string,
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Actual measurements are already saved by weighInParticipant
    // This action just confirms the organizer's decision to keep them in the division
    // No additional database updates needed

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
  })
}


/**
 * Bulk weigh-in participants using their declared measurements
 */
export async function bulkWeighIn(
  registrationIds: string[],
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { getRegistrationById, updateWeighIn } = await import('@/lib/db/queries/registrations')

    // Process in parallel
    await Promise.all(registrationIds.map(async (id) => {
      const reg = await getRegistrationById(id)

      // ONLY verified participants can be bulk weighed in
      if (reg.status !== 'verified') {
        throw new Error(`Participant ${reg.player?.first_name} ${reg.player?.last_name} is not verified.`)
      }

      if (reg.player) {
        // Use declared weight/height as actual
        await updateWeighIn(id, reg.player.weight, reg.player.height, userId)
      }
    }))

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
  })
}

import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Delete a single participant registration
 */
export async function deleteParticipant(
  participantId: string,
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const supabase = createServerSupabaseClient()

    // Delete the participant registration
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)

    if (error) {
      throw new Error(`Failed to delete participant: ${error.message}`)
    }

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Delete multiple participant registrations
 */
export async function bulkDeleteParticipants(
  participantIds: string[],
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const supabase = createServerSupabaseClient()

    // Delete all selected participants
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .in('id', participantIds)
      .eq('tournament_id', tournamentId)

    if (error) {
      throw new Error(`Failed to delete participants: ${error.message}`)
    }

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Export participants for a tournament (fetch all matching filters)
 */
export async function exportParticipants(
  tournamentId: string,
  filters: any
): Promise<ActionResult<any[]>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { getTournamentParticipants } = await import('@/lib/db/queries/registrations')

    // Fetch all records (high limit)
    const result = await getTournamentParticipants(tournamentId, {
      ...filters,
      limit: 10000,
      page: 1
    })

    return result.data
  })
}

/**
 * Delete the entire random weigh-in checklist
 */
export async function deleteWeighInChecklist(
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { clearWeighInSelected } = await import('@/lib/db/queries/registrations')

    await clearWeighInSelected(tournamentId)

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/weigh-in`)
  })
}

/**
 * Predict division and category based on measurements
 */
export async function getPredictedDivision(
  tournamentId: string,
  measurements: {
    weight?: number | null
    height?: number | null
    dob: string
    gender: 'male' | 'female'
    beltLevel?: string | null
  }
): Promise<{
  divisionName: string
  categoryName: string
  minWeight?: number | null
  maxWeight?: number | null
  minHeight?: number | null
  maxHeight?: number | null
  match: boolean
} | null> {
  const { calculateAge } = await import('@/lib/constants/divisions')
  const { getTournamentDivisions } = await import('@/lib/db/queries/divisions')

  const age = calculateAge(measurements.dob)
  const isHeightBased = age < 12

  const divisions = await getTournamentDivisions(tournamentId)

  // Find all divisions matching age
  let matchingDivisions = divisions.filter(d => {
    const meetsMin = d.min_age === null || age >= d.min_age
    const meetsMax = d.max_age === null || age <= d.max_age
    return meetsMin && meetsMax
  })

  // Prioritize divisions based on belt level match in name
  if (measurements.beltLevel) {
    const belt = measurements.beltLevel.toLowerCase()
    matchingDivisions.sort((a, b) => {
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      const aHasBelt = aName.includes(belt)
      const bHasBelt = bName.includes(belt)
      if (aHasBelt && !bHasBelt) return -1
      if (!aHasBelt && bHasBelt) return 1
      return 0
    })
  } else {
    // If no belt level, maybe prioritize "Standard" or shorter names?
    // Default order from DB is usually fine (by min_age).
  }

  // Iterate to find first valid match
  for (const division of matchingDivisions) {
    if (!division.tournament_categories) continue

    // Find category matching gender and measurements
    const category = (division.tournament_categories as any[]).find((c: any) => {
      if (c.gender !== 'both' && c.gender !== measurements.gender) return false

      if (isHeightBased) {
        if (!measurements.height) return false
        const min = c.min_height ?? 0
        const max = c.max_height ?? Infinity
        // Inclusive limits for height
        return measurements.height >= min && measurements.height <= max
      } else {
        if (!measurements.weight) return false
        const min = c.min_weight ?? 0
        const max = c.max_weight ?? Infinity
        // Weight logic:
        // If min is 0 (or null), then usually it means <= max.
        // If min is set, usually it means > min && <= max.

        if (min === 0) {
          return measurements.weight > 0 && measurements.weight <= max
        }

        // Handle the gap between categories (e.g. Max 54.00 vs Min 54.01)
        // Treat Min 54.01 as "Over 54.00" (effectively > 54.00)
        // But also ensure we include the exact min value if entered.
        // If we simply use >= min, we cover 54.01.
        // If we subtract epsilon, we cover 54.005.
        // Given the inputs are now high precision, coverage for 54.005 is important.
        const effectiveMin = (min % 1 === 0.01) ? min - 0.01 : min

        // If we adjusted it (e.g. 54.01 -> 54.00), we use strict greater ( > 54.00 )
        // If we didn't (e.g. 54.00), we probably want >= 54.00? No, usually overlap isn't allowed.
        // Let's stick to the "Over X" meant by X.01 convention.

        if (min % 1 === 0.01) {
          return measurements.weight > effectiveMin && measurements.weight <= max
        }

        // Fallback for non-standard gaps: inclusive min
        return measurements.weight >= min && measurements.weight <= max
      }
    })

    if (category) {
      return {
        divisionName: division.name,
        categoryName: category.name,
        minWeight: category.min_weight,
        maxWeight: category.max_weight,
        minHeight: category.min_height,
        maxHeight: category.max_height,
        match: true
      }
    }
  }

  // If no match found, return info about the first age-matching division for context, or generic failure
  const defaultDiv = matchingDivisions[0]

  if (defaultDiv) {
    return {
      divisionName: defaultDiv.name,
      categoryName: 'No matching category',
      match: false
    }
  }

  return null
}
