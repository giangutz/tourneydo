'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { safeAction } from '@/lib/utils/errors'
import { logger } from '@/lib/logger'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'

/**
 * Weigh in a participant with actual measurements.
 *
 * If the participant has no division yet, auto-assigns via getPredictedDivision.
 * Returns needsAction=true when measurements fall outside the registered category
 * limits, along with suggested alternative divisions.
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

    // Dynamic imports avoid circular dependencies at module load time
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

    // If participant is not yet assigned to a division, auto-assign based on registered measurements
    if (!registration.division_id || !registration.category_id) {
      logger.info({ registrationId }, 'Auto-assign: participant not yet in a division, predicting')

      const prediction = await getPredictedDivision(tournamentId, {
        weight: registration.player.weight,
        height: registration.player.height,
        dob: registration.player.dob,
        gender: registration.player.gender as 'male' | 'female',
        beltLevel: registration.player.belt_level
      })

      if (!prediction || !prediction.match) {
        throw new Error('Cannot determine appropriate division for this participant. Please assign manually.')
      }

      // Get tournament divisions to find the predicted division/category IDs
      const divisions = await getTournamentDivisions(tournamentId)
      const division = divisions.find(d => d.name === prediction.divisionName)

      if (!division) {
        throw new Error(`Predicted division "${prediction.divisionName}" not found in tournament`)
      }

      const category = (division.tournament_categories as any[])?.find(
        (c: any) => c.name === prediction.categoryName && c.gender === registration.player.gender
      )

      if (!category) {
        throw new Error(`Predicted category "${prediction.categoryName}" not found in division "${prediction.divisionName}"`)
      }

      logger.info({ divisionId: division.id, divisionName: division.name, categoryId: category.id, categoryName: category.name }, 'Auto-assign: assigning participant')

      // Assign the participant to the predicted division
      const { assignParticipantDivision } = await import('@/lib/db/queries/divisions')
      await assignParticipantDivision(registrationId, division.id, category.id)

      // Update the registration object for validation below
      registration.division_id = division.id
      registration.category_id = category.id

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
      // Clear any existing disqualification status (measurements are now valid)
      const { updateDisqualification } = await import('@/lib/db/queries/registrations')
      await updateDisqualification(registrationId, false, null)

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
    // BUT DO NOT finalize the weigh-in (don't set weighed_in_at timestamp)
    // This allows organizer to make a decision without marking them as "Weighed In"
    const { updateWeighInMeasurements } = await import('@/lib/db/queries/registrations')
    await updateWeighInMeasurements(registrationId, actualWeight, actualHeight, userId)

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
 * Predict the best-fit division and category for a participant's measurements.
 * Used by the weigh-in flow to auto-assign unassigned participants.
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
