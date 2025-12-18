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

  // 1. Get existing divisions and categories
  const existingDivisions = await getTournamentDivisions(tournamentId)

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
      const existingCat = existingCategories.find(
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
