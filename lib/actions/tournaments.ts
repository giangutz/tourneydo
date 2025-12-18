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

  const rawData = Object.fromEntries(formData.entries())
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
  }

  let tournamentId: string
  try {
    const result = await createTournamentQuery(tournamentData)
    tournamentId = result.id
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath(routes.organizer.tournaments)
  return { success: true, tournamentId }
}

export async function updateTournament(id: string, prevState: any, formData: FormData): Promise<TournamentFormState> {

  const rawData = Object.fromEntries(formData.entries())
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
  }

  try {
    await updateTournamentQuery(id, tournamentData)
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
