import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { DivisionConfig, CategoryConfig } from '@/lib/constants/divisions'

/**
 * Create default divisions for a tournament
 */
export async function createDefaultDivisions(
  tournamentId: string,
  divisions: DivisionConfig[]
) {
  const supabase = createServerSupabaseClient()

  for (const division of divisions) {
    // Create division
    const { data: divisionData, error: divisionError } = await supabase
      .from('tournament_divisions')
      .insert({
        tournament_id: tournamentId,
        name: division.name,
        min_age: division.minAge,
        max_age: division.maxAge,
        enabled: true,
      })
      .select()
      .single()

    if (divisionError) {
      throw new Error(`Failed to create division: ${divisionError.message}`)
    }

    // Create categories for this division
    const categoriesToInsert = division.categories.map(cat => ({
      division_id: divisionData.id,
      name: cat.name,
      gender: cat.gender,
      min_weight: cat.minWeight || null,
      max_weight: cat.maxWeight || null,
      min_height: cat.minHeight || null,
      max_height: cat.maxHeight || null,
    }))

    const { error: categoriesError } = await supabase
      .from('tournament_categories')
      .insert(categoriesToInsert)

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`)
    }
  }
}

/**
 * Get divisions for a tournament
 */
export async function getTournamentDivisions(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_divisions')
    .select(`
      *,
      tournament_categories (
        id,
        name,
        gender,
        min_weight,
        max_weight,
        min_height,
        max_height
      )
    `)
    .eq('tournament_id', tournamentId)
    .eq('enabled', true)
    .order('min_age', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch divisions: ${error.message}`)
  }

  return data || []
}

/**
 * Ensure all default divisions and categories exist for a tournament
 * Backfills any missing entries
 */
export async function ensureTournamentDivisionsAndCategories(
  tournamentId: string,
  defaults: DivisionConfig[]
) {
  const supabase = createServerSupabaseClient()

  // 1. Get existing divisions and categories (including disabled)
  const existingDivisions = await getAllTournamentDivisions(tournamentId)

  for (const defaultDiv of defaults) {
    let divId: string
    let currentDiv = existingDivisions.find(
      (d) => d.name.toLowerCase() === defaultDiv.name.toLowerCase()
    )

    if (currentDiv) {
      divId = currentDiv.id
      // Update division age limits if changed
      if (currentDiv.min_age !== defaultDiv.minAge || currentDiv.max_age !== defaultDiv.maxAge) {
        await supabase.from('tournament_divisions')
          .update({ min_age: defaultDiv.minAge, max_age: defaultDiv.maxAge })
          .eq('id', divId)
      }
    } else {
      // Create missing division
      const { data, error } = await supabase
        .from('tournament_divisions')
        .insert({
          tournament_id: tournamentId,
          name: defaultDiv.name,
          min_age: defaultDiv.minAge,
          max_age: defaultDiv.maxAge,
          enabled: true,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create division ${defaultDiv.name}: ${error.message}`)
      divId = data.id
      currentDiv = { ...data, tournament_categories: [] } // Optimized structure
    }

    // Check and create/update categories
    const existingCategories = currentDiv?.tournament_categories || []

    for (const defaultCat of defaultDiv.categories) {
      const existingCat: any = existingCategories.find(
        (c: any) =>
          c.name.toLowerCase() === defaultCat.name.toLowerCase() &&
          c.gender === defaultCat.gender
      )

      if (!existingCat) {
        const { error } = await supabase
          .from('tournament_categories')
          .insert({
            division_id: divId,
            name: defaultCat.name,
            gender: defaultCat.gender,
            min_weight: defaultCat.minWeight || null,
            max_weight: defaultCat.maxWeight || null,
            min_height: defaultCat.minHeight || null,
            max_height: defaultCat.maxHeight || null,
          })

        if (error) {
          console.error(`Failed to create category ${defaultCat.name} for division ${defaultDiv.name}:`, error)
        }
      } else {
        // Update category if weight/height limits differ
        // We check strict equality for now
        const needsUpdate =
          existingCat.min_weight !== (defaultCat.minWeight || null) ||
          existingCat.max_weight !== (defaultCat.maxWeight || null) ||
          existingCat.min_height !== (defaultCat.minHeight || null) ||
          existingCat.max_height !== (defaultCat.maxHeight || null)

        if (needsUpdate) {
          await supabase
            .from('tournament_categories')
            .update({
              min_weight: defaultCat.minWeight || null,
              max_weight: defaultCat.maxWeight || null,
              min_height: defaultCat.minHeight || null,
              max_height: defaultCat.maxHeight || null,
            } as any) // Casting as any to bypass strict type check for now if types are outdated
            .eq('id', existingCat.id)
        }
      }
    }

    // 3. Cleanup: Delete categories that are no longer in the default configuration
    const expectedCategoryNames = new Set(defaultDiv.categories.map(c => `${c.name.toLowerCase()}|${c.gender}`))

    // existingCategories contains ALL categories for this division (from fetch)
    // We filter out those that are NOT in the expected set
    const categoriesToDelete = existingCategories.filter((existingCat: any) => {
      const key = `${existingCat.name.toLowerCase()}|${existingCat.gender}`
      return !expectedCategoryNames.has(key)
    })

    if (categoriesToDelete.length > 0) {
      const idsToDelete = categoriesToDelete.map((c: any) => c.id)
      console.log(`Cleaning up ${idsToDelete.length} obsolete categories for division ${defaultDiv.name}`)

      const { error: delError } = await supabase
        .from('tournament_categories')
        .delete()
        .in('id', idsToDelete)

      if (delError) {
        console.error('Failed to cleanup obsolete categories:', delError)
      }
    }
  }
}

/**
 * Restore missing default categories for existing divisions
 * Safely adds back categories (e.g. when switching gender preference) without overwriting custom settings
 */
export async function restoreDefaultCategoriesSafely(
  tournamentId: string,
  defaults: DivisionConfig[]
) {
  const supabase = createServerSupabaseClient()

  // 1. Get existing divisions and categories
  const existingDivisions = await getAllTournamentDivisions(tournamentId)

  for (const defaultDiv of defaults) {
    // Only process if division exists in DB (we don't force-create disabled/deleted divisions)
    const currentDiv = existingDivisions.find(
      (d) => d.name.toLowerCase() === defaultDiv.name.toLowerCase()
    )

    if (currentDiv) {
      // Check and create MISSING categories only
      const existingCategories = currentDiv?.tournament_categories || []

      for (const defaultCat of defaultDiv.categories) {
        const existingCat: any = existingCategories.find(
          (c: any) =>
            c.name.toLowerCase() === defaultCat.name.toLowerCase() &&
            c.gender === defaultCat.gender
        )

        // Only insert if completely missing
        if (!existingCat) {
          const { error } = await supabase
            .from('tournament_categories')
            .insert({
              division_id: currentDiv.id,
              name: defaultCat.name,
              gender: defaultCat.gender,
              min_weight: defaultCat.minWeight || null,
              max_weight: defaultCat.maxWeight || null,
              min_height: defaultCat.minHeight || null,
              max_height: defaultCat.maxHeight || null,
            })

          if (error) {
            console.error(`Failed to restore category ${defaultCat.name} for division ${defaultDiv.name}:`, error)
          }
        }
        // Do NOT update existing categories - preserve custom limits
      }
    }
  }
}

/**
 * Assign participant to division and category
 */
export async function assignParticipantDivision(
  registrationId: string,
  divisionId: string,
  categoryId: string
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_registrations')
    .update({
      division_id: divisionId,
      category_id: categoryId,
    })
    .eq('id', registrationId)

  if (error) {
    throw new Error(`Failed to assign division: ${error.message}`)
  }
}

/**
 * Batch assign multiple participants to divisions (for bracket generation)
 * Uses service role to avoid JWT expiration on large batches
 * Processes in chunks to avoid overwhelming the database
 */
export async function batchAssignParticipantDivisions(
  assignments: Array<{ registrationId: string; divisionId: string; categoryId: string }>
) {
  const { createServiceSupabaseClient } = await import('@/lib/supabase/service')
  const supabase = createServiceSupabaseClient()

  const CHUNK_SIZE = 25 // Process 25 updates at a time (reduced from 50)
  const DELAY_MS = 200 // Delay between chunks to avoid overwhelming Supabase
  const chunks: typeof assignments[] = []

  // Split assignments into chunks
  for (let i = 0; i < assignments.length; i += CHUNK_SIZE) {
    chunks.push(assignments.slice(i, i + CHUNK_SIZE))
  }

  console.log(`[BATCH_ASSIGN] Processing ${assignments.length} assignments in ${chunks.length} chunks of ${CHUNK_SIZE}`)

  // Process each chunk sequentially with delay
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log(`[BATCH_ASSIGN] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} assignments)`)

    // Execute all updates in this chunk in parallel
    const updatePromises = chunk.map(({ registrationId, divisionId, categoryId }) =>
      supabase
        .from('tournament_registrations')
        .update({
          division_id: divisionId,
          category_id: categoryId,
        })
        .eq('id', registrationId)
    )

    const results = await Promise.all(updatePromises)

    // Check for any errors in this chunk
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error(`[BATCH_ASSIGN] Errors in chunk ${i + 1}:`, errors.map(e => e.error?.message))
      throw new Error(`Failed to batch assign divisions (chunk ${i + 1}): ${errors[0].error?.message}`)
    }

    // Add delay between chunks (except after the last chunk)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  console.log(`[BATCH_ASSIGN] Successfully assigned ${assignments.length} participants`)
}

/**
 * Get all divisions for a tournament (including disabled ones)
 * Used for division management UI
 */
export async function getAllTournamentDivisions(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_divisions')
    .select(`
      *,
      tournament_categories (
        id,
        name,
        gender,
        min_weight,
        max_weight,
        min_height,
        max_height
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('min_age', { ascending: true, nullsFirst: true })

  if (error) {
    throw new Error(`Failed to fetch all divisions: ${error.message}`)
  }

  return data || []
}

/**
 * Update division enabled status
 */
export async function updateDivisionStatus(
  divisionId: string,
  enabled: boolean
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_divisions')
    .update({ enabled })
    .eq('id', divisionId)

  if (error) {
    throw new Error(`Failed to update division status: ${error.message}`)
  }
}

/**
 * Update category weight/height limits
 */
export async function updateCategoryLimits(
  categoryId: string,
  limits: {
    min_weight?: number | null
    max_weight?: number | null
    min_height?: number | null
    max_height?: number | null
  }
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_categories')
    .update(limits)
    .eq('id', categoryId)

  if (error) {
    throw new Error(`Failed to update category limits: ${error.message}`)
  }
}

/**
 * Update category name
 */
export async function updateCategoryName(
  categoryId: string,
  name: string
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_categories')
    .update({ name })
    .eq('id', categoryId)

  if (error) {
    throw new Error(`Failed to update category name: ${error.message}`)
  }
}

/**
 * Create a custom category for a division
 */
export async function createCustomCategory(
  divisionId: string,
  category: {
    name: string
    gender: 'male' | 'female' | 'both'
    min_weight?: number | null
    max_weight?: number | null
    min_height?: number | null
    max_height?: number | null
  }
) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_categories')
    .insert({
      division_id: divisionId,
      ...category
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`)
  }

  return data
}

/**
 * Delete a category
 * Only allowed if no participants are assigned to it
 */
export async function deleteCategory(categoryId: string) {
  const supabase = createServerSupabaseClient()

  // Check if any participants are assigned to this category
  const { data: registrations, error: checkError } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)

  if (checkError) {
    throw new Error(`Failed to check category usage: ${checkError.message}`)
  }

  if (registrations && registrations.length > 0) {
    throw new Error('Cannot delete category with assigned participants')
  }

  const { error } = await supabase
    .from('tournament_categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`)
  }
}

/**
 * Toggle category gender (enable/disable male or female)
 */
export async function toggleCategoryGender(
  divisionId: string,
  gender: 'male' | 'female',
  enabled: boolean
) {
  const supabase = createServerSupabaseClient()

  if (enabled) {
    // Re-enable: Update existing categories or do nothing
    // Categories are typically not deleted, just filtered
    return
  } else {
    // Disable: Check if any participants exist, then soft-delete or mark
    // For now, we'll just return an error if participants exist
    const { data: registrations, error: checkError } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('division_id', divisionId)
      .limit(1)

    if (checkError) {
      throw new Error(`Failed to check division usage: ${checkError.message}`)
    }

    if (registrations && registrations.length > 0) {
      throw new Error(`Cannot disable ${gender} categories with assigned participants`)
    }

    // Delete all categories of this gender in this division
    const { error } = await supabase
      .from('tournament_categories')
      .delete()
      .eq('division_id', divisionId)
      .eq('gender', gender)

    if (error) {
      throw new Error(`Failed to disable ${gender} categories: ${error.message}`)
    }
  }
}


/**
 * Remove categories of a specific gender for a tournament
 * Used during setup to enforce "Men Only" or "Women Only" preference
 */
export async function removeCategoriesByGender(tournamentId: string, genderToRemove: 'male' | 'female') {
  const supabase = createServerSupabaseClient()

  // We need to delete from tournament_categories where
  // 1. Division belongs to this tournament
  // 2. Gender matches

  // First get all division IDs for this tournament
  const { data: divisions } = await supabase
    .from('tournament_divisions')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (!divisions?.length) return

  const divisionIds = divisions.map(d => d.id)

  const { error } = await supabase
    .from('tournament_categories')
    .delete()
    .in('division_id', divisionIds)
    .eq('gender', genderToRemove)

  if (error) {
    throw new Error(`Failed to remove ${genderToRemove} categories: ${error.message}`)
  }
}

/**
 * Get division and category details with limits
 * Used for weigh-in validation to ensure accurate category limits are displayed
 */
export async function getDivisionCategoryDetails(divisionId: string, categoryId: string) {
  const supabase = createServerSupabaseClient()

  const { data: division, error: divError } = await supabase
    .from('tournament_divisions')
    .select(`
      *,
      tournament_categories (
        id,
        name,
        gender,
        min_weight,
        max_weight,
        min_height,
        max_height
      )
    `)
    .eq('id', divisionId)
    .single()

  if (divError) {
    throw new Error(`Failed to fetch division: ${divError.message}`)
  }

  const category = (division.tournament_categories as any[])?.find((c: any) => c.id === categoryId)

  if (!category) {
    throw new Error('Category not found in division')
  }

  return {
    division: {
      id: division.id,
      name: division.name,
      min_age: division.min_age,
      max_age: division.max_age
    },
    category: {
      id: category.id,
      name: category.name,
      gender: category.gender,
      min_weight: category.min_weight,
      max_weight: category.max_weight,
      min_height: category.min_height,
      max_height: category.max_height
    }
  }
}

/**
 * Create a new custom division
 */
export async function createDivision(
  tournamentId: string,
  data: {
    name: string
    min_age?: number | null
    max_age?: number | null
  }
) {
  const supabase = createServerSupabaseClient()

  const { data: division, error } = await supabase
    .from('tournament_divisions')
    .insert({
      tournament_id: tournamentId,
      name: data.name,
      min_age: data.min_age || null,
      max_age: data.max_age || null,
      enabled: true // Default enabled
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create division: ${error.message}`)
  }

  // Optimize: Return with empty categories array to match expected structure
  return { ...division, tournament_categories: [] }
}

/**
 * Update division details (name, age limits)
 */
export async function updateDivision(
  divisionId: string,
  data: {
    name?: string
    min_age?: number | null
    max_age?: number | null
  }
) {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('tournament_divisions')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.min_age !== undefined && { min_age: data.min_age }),
      ...(data.max_age !== undefined && { max_age: data.max_age }),
    })
    .eq('id', divisionId)

  if (error) {
    throw new Error(`Failed to update division: ${error.message}`)
  }
}

/**
 * Delete a division
 * Only allowed if no participants are assigned to it
 */
export async function deleteDivision(divisionId: string) {
  const supabase = createServerSupabaseClient()

  // Safety check: Check for registrations
  const { data: registrations, error: checkError } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('division_id', divisionId)
    .limit(1)

  if (checkError) {
    throw new Error(`Failed to check division usage: ${checkError.message}`)
  }

  if (registrations && registrations.length > 0) {
    throw new Error('Cannot delete division with registered participants')
  }

  // Delete division (categories will cascade delete due to FK)
  const { error } = await supabase
    .from('tournament_divisions')
    .delete()
    .eq('id', divisionId)

  if (error) {
    throw new Error(`Failed to delete division: ${error.message}`)
  }
}
