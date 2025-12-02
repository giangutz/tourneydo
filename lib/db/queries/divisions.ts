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
      tournament_categories (*)
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
