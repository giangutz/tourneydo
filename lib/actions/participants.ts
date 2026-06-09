'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { updateRegistrationStatus as updateRegistrationStatusQuery } from '@/lib/db/queries/registrations'
import { safeAction } from '@/lib/utils/errors'
import { logger } from '@/lib/logger'
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
      weigh_in_selected: false,
      random_weigh_in_weight: null,
      random_weigh_in_at: null,
      random_weigh_in_passed: null,
      random_weigh_in_by: null
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
    logger.error({ error: err }, 'Validation check failed')
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

    const { updateDivisionAssignment, getRegistrationById, updateWeighIn, updateDisqualification } = await import('@/lib/db/queries/registrations')

    // Clear any existing disqualification status (they're being moved to a valid division)
    await updateDisqualification(registrationId, false, null)

    // Update division assignment
    await updateDivisionAssignment(registrationId, newDivisionId, newCategoryId)

    // Finalize the weigh-in with the already-saved measurements
    const registration = await getRegistrationById(registrationId)
    await updateWeighIn(
      registrationId,
      registration.actual_weight,
      registration.actual_height,
      userId
    )

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

    const { updateDisqualification, getRegistrationById, updateWeighIn } = await import('@/lib/db/queries/registrations')
    const { findActiveMatchForParticipant, forfeitMatch } = await import('@/lib/db/queries/matches')

    // 1. Update DQ status in registration
    await updateDisqualification(registrationId, true, reason)

    // 2. Finalize the weigh-in with the already-saved measurements
    const reg = await getRegistrationById(registrationId)
    await updateWeighIn(
      registrationId,
      reg.actual_weight,
      reg.actual_height,
      userId
    )

    // 3. Auto-forfeit active match
    try {
      if (reg.player_id) {
        // Find if they are in an active match
        const activeMatch = await findActiveMatchForParticipant(reg.player_id, tournamentId)

        if (activeMatch) {
          logger.info({ matchId: activeMatch.id, playerId: reg.player_id }, 'DQ auto-action: forfeiting active match')
          await forfeitMatch(activeMatch.id, reg.player_id)
        }
      }
    } catch (err) {
      logger.error({ error: err }, 'DQ auto-action: failed to forfeit match — participant is DQ\'d but match state may need manual correction')
      // Non-fatal: participant is already disqualified (step 1); forfeit failure only affects bracket progression.
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

    // Measurements were saved by weighInParticipant using updateWeighInMeasurements
    // Now we need to finalize the weigh-in by setting the timestamp
    const { getRegistrationById, updateWeighIn, updateDisqualification } = await import('@/lib/db/queries/registrations')

    // Clear any existing disqualification status (organizer is allowing them to compete)
    await updateDisqualification(registrationId, false, null)

    const registration = await getRegistrationById(registrationId)

    // Finalize with the already-saved measurements
    await updateWeighIn(
      registrationId,
      registration.actual_weight,
      registration.actual_height,
      userId
    )

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

