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
): Promise<ActionResult<{ needsAction: boolean; outOfRange?: 'above' | 'below'; exceededLimit?: 'weight' | 'height'; suggestedDivisions?: any[] }>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Import here to avoid circular dependencies
    const { getRegistrationById, updateWeighIn } = await import('@/lib/db/queries/registrations')
    const { getTournamentDivisions } = await import('@/lib/db/queries/divisions')
    const { validateWeightHeight, findAlternativeDivisions } = await import('@/lib/utils/weigh-in-validator')
    const { calculateAge } = await import('@/lib/constants/divisions')

    // Get registration with player data
    const registration = await getRegistrationById(registrationId)

    if (!registration.player?.dob || !registration.player?.gender) {
      throw new Error('Player must have date of birth and gender')
    }

    // If participant is not yet assigned to a division, just save the measurements
    // Division assignment will happen later based on these measurements
    if (!registration.division_id || !registration.category_id) {
      await updateWeighIn(registrationId, actualWeight, actualHeight)
      revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
      return { needsAction: false }
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

    // Calculate age
    const age = calculateAge(registration.player.dob)

    // Validate against registered category limits
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

    // If within limits, save and return success
    if (validation.valid) {
      await updateWeighIn(registrationId, actualWeight, actualHeight)
      revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
      return { needsAction: false }
    }

    // If out of range, find alternative divisions
    const suggestedDivisions = findAlternativeDivisions(
      age,
      registration.player.gender as 'male' | 'female',
      actualWeight,
      actualHeight,
      validation.outOfRange!,
      validation.exceededLimit!
    )

    // Save the actual measurements even though they're out of range
    // This allows organizer to make a decision
    await updateWeighIn(registrationId, actualWeight, actualHeight)
    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    return {
      needsAction: true,
      outOfRange: validation.outOfRange!,
      exceededLimit: validation.exceededLimit!,
      suggestedDivisions: suggestedDivisions.map(s => ({
        divisionName: s.division.name,
        categoryName: s.category.name,
        categoryGender: s.category.gender,
        reason: s.reason,
        // We'll need to find the DB IDs for these
        // For now, return the config data
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

    const { updateDisqualification } = await import('@/lib/db/queries/registrations')

    await updateDisqualification(registrationId, true, reason)

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))
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
      if (reg.player) {
        // Use declared weight/height as actual
        await updateWeighIn(id, reg.player.weight, reg.player.height)
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
