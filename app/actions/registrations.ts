'use server'

import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function registerAthletes(tournamentId: string, registrations: { athleteId: string, divisionId: string }[]) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  // Verify coach owns these athletes
  // (RLS policies will handle this, but good to check or handle errors gracefully)

  // Calculate fees
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('fees')
    .eq('id', tournamentId)
    .single()

  const feesPerAthlete = tournament?.fees || 0
  const totalNewFees = feesPerAthlete * registrations.length

  // Insert registrations
  const { error } = await supabase
    .from('registrations')
    .insert(
      registrations.map(reg => ({
        tournament_id: tournamentId,
        athlete_id: reg.athleteId,
        division_id: reg.divisionId,
      }))
    )

  if (error) return { error: error.message }

  // Update or create payment record
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, amount')
    .eq('tournament_id', tournamentId)
    .eq('coach_user_id', userId)
    .single()

  if (existingPayment) {
    await supabase
      .from('payments')
      .update({ amount: existingPayment.amount + totalNewFees })
      .eq('id', existingPayment.id)
  } else {
    await supabase
      .from('payments')
      .insert({
        tournament_id: tournamentId,
        coach_user_id: userId,
        amount: totalNewFees,
        status: 'pending'
      })
  }

  revalidatePath('/dashboard/coach/registrations')
  revalidatePath('/dashboard/coach/payments')
  return { success: true }
}

export async function getCoachRegistrations() {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  // Get team first
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('coach_user_id', userId)
    .single()

  if (!team) return { data: [] }

  const { data: registrations, error } = await supabase
    .from('registrations')
    .select(`
      *,
      tournaments (title, date, status),
      athletes (name, weight, belt_level),
      divisions (name)
    `)
    .in('athlete_id', (
      await supabase.from('athletes').select('id').eq('team_id', team.id)
    ).data?.map(a => a.id) || [])
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: registrations }
}
