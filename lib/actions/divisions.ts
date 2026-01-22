'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import {
  updateDivisionStatus as updateDivisionStatusQuery,
  updateCategoryLimits as updateCategoryLimitsQuery,
  updateCategoryName as updateCategoryNameQuery,
  createCustomCategory as createCustomCategoryQuery,
  deleteCategory as deleteCategoryQuery,
  createDivision as createDivisionQuery,
  updateDivision as updateDivisionQuery,
  deleteDivision as deleteDivisionQuery,
  getAllTournamentDivisions
} from '@/lib/db/queries/divisions'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'

/**
 * Update division enabled status
 */
export async function updateDivisionStatus(
  tournamentId: string,
  divisionId: string,
  enabled: boolean
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await updateDivisionStatusQuery(divisionId, enabled)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}

/**
 * Update category weight/height limits
 */
export async function updateCategoryLimits(
  tournamentId: string,
  categoryId: string,
  limits: {
    min_weight?: number | null
    max_weight?: number | null
    min_height?: number | null
    max_height?: number | null
  }
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await updateCategoryLimitsQuery(categoryId, limits)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}

/**
 * Update category name
 */
export async function updateCategoryName(
  tournamentId: string,
  categoryId: string,
  name: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await updateCategoryNameQuery(categoryId, name)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}

/**
 * Create a custom category
 */
export async function createCustomCategory(
  tournamentId: string,
  divisionId: string,
  category: {
    name: string
    gender: 'male' | 'female' | 'both'
    min_weight?: number | null
    max_weight?: number | null
    min_height?: number | null
    max_height?: number | null
  }
): Promise<ActionResult<any>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const newCategory = await createCustomCategoryQuery(divisionId, category)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)

    return newCategory
  })
}

/**
 * Delete a category
 */
export async function deleteCategory(
  tournamentId: string,
  categoryId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await deleteCategoryQuery(categoryId)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}

/**
 * Get all divisions for management UI
 */
export async function getDivisionsForManagement(
  tournamentId: string
): Promise<ActionResult<any[]>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    return await getAllTournamentDivisions(tournamentId)
  })
}

/**
 * Create a new division
 */
export async function createDivision(
  tournamentId: string,
  data: {
    name: string
    min_age?: number | null
    max_age?: number | null
  }
): Promise<ActionResult<any>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const division = await createDivisionQuery(tournamentId, data)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)

    return division
  })
}

/**
 * Update division details
 */
export async function updateDivision(
  tournamentId: string,
  divisionId: string,
  data: {
    name?: string
    min_age?: number | null
    max_age?: number | null
  }
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await updateDivisionQuery(divisionId, data)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}

/**
 * Delete a division
 */
export async function deleteDivision(
  tournamentId: string,
  divisionId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    await deleteDivisionQuery(divisionId)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/divisions`)
  })
}
