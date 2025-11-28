'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { routes } from '@/config/routes'
import { TournamentInsert, TournamentUpdate } from '@/types/models'
import { auth } from '@clerk/nextjs/server'
import {
  createTournament as createTournamentQuery,
  updateTournament as updateTournamentQuery,
  deleteTournament as deleteTournamentQuery
} from '@/lib/db/queries/tournaments'

const tournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().optional(),
  entry_fee: z.coerce.number().min(0, 'Entry fee must be at least 0'),
  venue: z.string().min(1, 'Venue is required'),
  max_players: z.coerce.number().min(1, 'Max players is required'),
  registration_deadline: z.string().min(1, 'Registration deadline is required'),
  status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
})

export async function createTournament(prevState: any, formData: FormData) {
  const { userId } = await auth()

  if (!userId) {
    return { error: 'Unauthorized' }
  }

  const rawData = Object.fromEntries(formData.entries())
  const validatedFields = tournamentSchema.safeParse(rawData)

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
    description: validatedFields.data.description || null,
    entry_fee: validatedFields.data.entry_fee || null,
    venue: validatedFields.data.venue || null,
    max_players: validatedFields.data.max_players || null,
    registration_deadline: validatedFields.data.registration_deadline || null,
    status: validatedFields.data.status as any,
  }

  try {
    await createTournamentQuery(tournamentData)
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath(routes.organizer.tournaments)
  redirect(routes.organizer.tournaments)
}

export async function updateTournament(id: string, prevState: any, formData: FormData) {

  const rawData = Object.fromEntries(formData.entries())
  const validatedFields = tournamentSchema.safeParse(rawData)

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
    description: validatedFields.data.description || null,
    entry_fee: validatedFields.data.entry_fee || null,
    venue: validatedFields.data.venue || null,
    max_players: validatedFields.data.max_players || null,
    registration_deadline: validatedFields.data.registration_deadline || null,
    status: validatedFields.data.status as any,
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
  try {
    await deleteTournamentQuery(id)
  } catch (error: any) {
    return { error: error.message }
  }

  revalidatePath(routes.organizer.tournaments)
  redirect(routes.organizer.tournaments)
}
