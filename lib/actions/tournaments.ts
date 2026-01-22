'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { routes } from '@/config/routes'
import { TournamentInsert, TournamentUpdate } from '@/types/models'
import { auth } from '@clerk/nextjs/server'
import {
  createTournament as createTournamentQuery,
  updateTournament as updateTournamentQuery,
  deleteTournament as deleteTournamentQuery
} from '@/lib/db/queries/tournaments'

import { tournamentFormSchema } from '@/lib/validations/tournament'

// Removed duplicate schema definition

export type TournamentFormState = {
  error?: string
  fieldErrors?: {
    [key: string]: string[] | undefined
  }
  success?: boolean
  tournamentId?: string
}

export async function createTournament(prevState: any, formData: FormData): Promise<TournamentFormState> {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Unauthorized' }
  }

  const rawData: any = Object.fromEntries(formData.entries())

  // Handle multi-value fields correctly (checkboxes send multiple entries)
  const beltGroups = formData.getAll('allowed_belt_groups')
  if (beltGroups.length > 0) {
    if (beltGroups.length === 1 && typeof beltGroups[0] === 'string' && beltGroups[0].startsWith('[')) {
      try {
        rawData.allowed_belt_groups = JSON.parse(beltGroups[0] as string);
      } catch {
        rawData.allowed_belt_groups = [beltGroups[0]];
      }
    } else {
      rawData.allowed_belt_groups = beltGroups;
    }
  }

  // Handle divisions checkboxes - convert to JSON string for schema
  const divisions = formData.getAll('divisions')
  if (divisions.length > 0) {
    // If multiple checkboxes, stringify the array
    if (divisions.length > 1 || (divisions.length === 1 && typeof divisions[0] === 'string' && !divisions[0].trim().startsWith('['))) {
      rawData.divisions = JSON.stringify(divisions)
    }
  }

  const validatedFields = tournamentFormSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const tournamentData: TournamentInsert = {
    name: validatedFields.data.name,
    organizer_id: userId,
    start_date: validatedFields.data.start_date || null,
    end_date: validatedFields.data.end_date || null,
    weigh_in_start: validatedFields.data.weigh_in_start || null,
    weigh_in_end: validatedFields.data.weigh_in_end || null,
    description: validatedFields.data.description || null,
    entry_fee: validatedFields.data.entry_fee ?? null,
    venue: validatedFields.data.venue || null,
    max_players: validatedFields.data.max_players ?? null,
    registration_deadline: validatedFields.data.registration_deadline || null,
    courts: validatedFields.data.courts ?? null, // Use nullish coalescing for numbers as 0 is valid but schema handles null
    status: validatedFields.data.status as any,
    tournament_type: validatedFields.data.tournament_type as any,
    gender_preference: validatedFields.data.gender_preference,
    allowed_belt_groups: validatedFields.data.allowed_belt_groups ?? null,
    division_move_policy: validatedFields.data.division_move_policy || 'allow_move',
  }

  let tournamentId: string
  try {
    const result = await createTournamentQuery(tournamentData)
    tournamentId = result.id
  } catch (error: any) {
    return { error: error.message }
  }

  // Create default divisions immediately
  try {
    const { ensureTournamentDivisionsAndCategories, updateDivisionStatus, getAllTournamentDivisions } = await import('@/lib/db/queries/divisions')
    const { DEFAULT_DIVISIONS } = await import('@/lib/constants/divisions')

    // Create initial structure
    await ensureTournamentDivisionsAndCategories(tournamentId, DEFAULT_DIVISIONS)

    // Handle gender preference - remove unwanted categories
    if (validatedFields.data.gender_preference && validatedFields.data.gender_preference !== 'mixed') {
      const { removeCategoriesByGender } = await import('@/lib/db/queries/divisions')
      const genderToRemove = validatedFields.data.gender_preference === 'male' ? 'female' : 'male'
      await removeCategoriesByGender(tournamentId, genderToRemove)
    }

    // If specific divisions were selected, disable the others
    if (validatedFields.data.divisions) {
      try {
        const selectedDivisions = JSON.parse(validatedFields.data.divisions) as string[]
        if (Array.isArray(selectedDivisions) && selectedDivisions.length > 0) {
          const allDivisions = await getAllTournamentDivisions(tournamentId)

          for (const div of allDivisions) {
            // Check if this division (or a key part of its name) is in selected list
            // Normalize names for comparison: "Grade School" vs "Gradeschool"
            const divNameNormalized = div.name.toLowerCase().replace(/\s+/g, '')
            const isSelected = selectedDivisions.some(selected =>
              divNameNormalized.includes(selected.toLowerCase().replace(/\s+/g, ''))
            )

            if (!isSelected) {
              await updateDivisionStatus(div.id, false)
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse selected divisions:', e)
      }
    }
  } catch (error) {
    console.error('Failed to setup initial divisions:', error)
    // Don't fail the whole creation, just log it
  }

  revalidatePath(routes.organizer.tournaments)
  return { success: true, tournamentId }
}

export async function updateTournament(id: string, prevState: any, formData: FormData): Promise<TournamentFormState> {

  const rawData: any = Object.fromEntries(formData.entries())

  // Handle multi-value fields correctly (checkboxes send multiple entries)
  const beltGroups = formData.getAll('allowed_belt_groups')
  if (beltGroups.length > 0) {
    if (beltGroups.length === 1 && typeof beltGroups[0] === 'string' && beltGroups[0].startsWith('[')) {
      try {
        rawData.allowed_belt_groups = JSON.parse(beltGroups[0] as string);
      } catch {
        rawData.allowed_belt_groups = [beltGroups[0]];
      }
    } else {
      rawData.allowed_belt_groups = beltGroups;
    }
  }

  // Handle divisions checkboxes - convert to JSON string for schema
  const divisions = formData.getAll('divisions')
  if (divisions.length > 0) {
    if (divisions.length > 1 || (divisions.length === 1 && typeof divisions[0] === 'string' && !divisions[0].trim().startsWith('['))) {
      rawData.divisions = JSON.stringify(divisions)
    }
  }

  const validatedFields = tournamentFormSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: 'Validation failed',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const tournamentData: TournamentUpdate = {
    name: validatedFields.data.name,
    start_date: validatedFields.data.start_date || null,
    end_date: validatedFields.data.end_date || null,
    weigh_in_start: validatedFields.data.weigh_in_start || null,
    weigh_in_end: validatedFields.data.weigh_in_end || null,
    description: validatedFields.data.description || null,
    entry_fee: validatedFields.data.entry_fee ?? null,
    venue: validatedFields.data.venue || null,
    max_players: validatedFields.data.max_players ?? null,
    registration_deadline: validatedFields.data.registration_deadline || null,
    courts: validatedFields.data.courts ?? null,
    status: validatedFields.data.status as any,
    tournament_type: validatedFields.data.tournament_type as any,
    gender_preference: validatedFields.data.gender_preference as any,
    allowed_belt_groups: validatedFields.data.allowed_belt_groups ?? null,
    division_move_policy: validatedFields.data.division_move_policy || 'allow_move',
  }

  try {
    await updateTournamentQuery(id, tournamentData)

    // HANDLE SUB-RESOURCE UPDATES (Divisions & Gender)
    // Same logic as create logic to ensure consistency when settings change

    // 1. Ensure Defaults & Restore if needed (essential if switching Gender back to Mixed)
    const { ensureTournamentDivisionsAndCategories, updateDivisionStatus, getAllTournamentDivisions, removeCategoriesByGender } = await import('@/lib/db/queries/divisions')
    const { DEFAULT_DIVISIONS } = await import('@/lib/constants/divisions')

    // Always re-ensure defaults which restores missing gender categories if switching back to 'mixed'
    await ensureTournamentDivisionsAndCategories(id, DEFAULT_DIVISIONS)

    // 2. Remove Categories if Single Gender
    if (validatedFields.data.gender_preference && validatedFields.data.gender_preference !== 'mixed') {
      const genderToRemove = validatedFields.data.gender_preference === 'male' ? 'female' : 'male'
      await removeCategoriesByGender(id, genderToRemove)
    }

    // 3. Sync Enabled Divisions
    if (validatedFields.data.divisions) {
      try {
        let selectedDivisions: string[] = []
        try {
          const parsed = JSON.parse(validatedFields.data.divisions)
          // Handle case where JSON.parse returns a single string or non-array
          selectedDivisions = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          // Handle raw strings (if not valid JSON)
          selectedDivisions = [validatedFields.data.divisions]
        }

        if (selectedDivisions.length > 0) {
          const allDivisions = await getAllTournamentDivisions(id)

          for (const div of allDivisions) {
            const divNameNormalized = div.name.toLowerCase().replace(/\s+/g, '')
            const isSelected = selectedDivisions.some(selected =>
              divNameNormalized.includes(String(selected).toLowerCase().replace(/\s+/g, ''))
            )
            // Enable if selected, Disable if not
            if (div.enabled !== isSelected) {
              await updateDivisionStatus(div.id, isSelected)
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse selected divisions during update:', e)
      }
    }

  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath(routes.organizer.tournaments)
  revalidatePath(routes.organizer.tournamentDetail(id))

  return { success: true }
}

export async function deleteTournament(id: string) {
  const supabase = createServerSupabaseClient()

  // Check status first
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', id)
    .single()

  if (tournament && (tournament as any).status === 'completed') {
    return { error: 'Cannot delete a completed tournament.' }
  }

  try {
    await deleteTournamentQuery(id)
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath(routes.organizer.tournaments)
}
