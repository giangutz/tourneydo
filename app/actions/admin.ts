'use server'

import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { TournamentStatus, Database } from '@/lib/supabase/types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function createTournament(formData: FormData) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const title = formData.get('title') as string
  const date = formData.get('date') as string
  const venue = formData.get('venue') as string
  const fees = parseFloat(formData.get('fees') as string)
  const registration_deadline = formData.get('registration_deadline') as string

  const { error } = await supabase
    .from('tournaments')
    .insert({
      title,
      date,
      venue,
      fees,
      registration_deadline,
      created_by: userId,
      status: 'upcoming'
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/tournaments')
  return { success: true }
}

export async function updateTournament(id: string, formData: FormData) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase = createClerkSupabaseClient(getToken)

  const title = formData.get('title') as string
  const date = formData.get('date') as string
  const venue = formData.get('venue') as string
  const fees = parseFloat(formData.get('fees') as string)
  const registration_deadline = formData.get('registration_deadline') as string
  const status = formData.get('status') as TournamentStatus

  const { error } = await supabase
    .from('tournaments')
    .update({
      title,
      date,
      venue,
      fees,
      registration_deadline,
      status
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/admin/tournaments/${id}`)
  revalidatePath('/dashboard/admin/tournaments')
  return { success: true }
}

export async function createDivision(tournamentId: string, formData: FormData) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase = createClerkSupabaseClient(getToken)

  const name = formData.get('name') as string
  const age_min = parseInt(formData.get('age_min') as string)
  const age_max = parseInt(formData.get('age_max') as string)
  const weight_min = parseFloat(formData.get('weight_min') as string)
  const weight_max = parseFloat(formData.get('weight_max') as string)
  const belt_level = formData.get('belt_level') as any
  const gender = formData.get('gender') as any

  const { error } = await supabase
    .from('divisions')
    .insert({
      tournament_id: tournamentId,
      name,
      age_min,
      age_max,
      weight_min,
      weight_max,
      belt_level,
      gender
    })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/admin/tournaments/${tournamentId}`)
  return { success: true }
}

export async function deleteDivision(divisionId: string, tournamentId: string) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { error } = await supabase
    .from('divisions')
    .delete()
    .eq('id', divisionId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/admin/tournaments/${tournamentId}`)
  return { success: true }
}

export async function getTournamentRegistrations(tournamentId: string) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('registrations')
    .select(`
      *,
      athlete:athletes (*),
      division:divisions (*)
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}
