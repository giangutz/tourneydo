'use server'

import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { Database } from '@/lib/supabase/types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function getAdminPayments() {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      tournaments (title),
      coach:coach_user_id (
        *
      )
    `) // Note: coach_user_id is a string, not a foreign key to a table we can join easily unless we have a public users table. 
  // But wait, we don't have a public users table in Supabase that maps to Clerk IDs directly for joining in this query unless we synced them.
  // We only have `teams` table which has `coach_user_id`.
  // We can join `teams` to get coach info if needed, or just display the ID.
  // Actually, we can't easily get the coach's name unless we fetch it from Clerk or if we stored it in `teams`.
  // `teams` has `name` (Team Name).
  // Let's join `teams` on `coach_user_id`.

  // Revised query to get team info
  // We can't join on `coach_user_id` directly if there's no FK relationship defined in Supabase.
  // My schema has `teams` with `coach_user_id`.
  // I can fetch payments, then for each payment, fetch the team name.
  // Or I can define a relationship in Supabase.

  // For now, let's just fetch payments and tournaments.
  // We'll fetch team names in a separate query or client side if needed, or just show the user ID.
  // Actually, let's try to fetch team info by matching `coach_user_id`.

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      *,
      tournaments (title)
    `)
    .order('created_at', { ascending: false })

  if (paymentsError) return { error: paymentsError.message }

  // Fetch team names manually
  const coachIds = Array.from(new Set(payments.map(p => p.coach_user_id)))
  const { data: teams } = await supabase
    .from('teams')
    .select('coach_user_id, name')
    .in('coach_user_id', coachIds)

  const paymentsWithTeams = payments.map(p => ({
    ...p,
    teamName: teams?.find(t => t.coach_user_id === p.coach_user_id)?.name || 'Unknown Team'
  }))

  return { data: paymentsWithTeams }
}

export async function verifyPayment(paymentId: string, status: 'verified' | 'rejected') {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { error } = await supabase
    .from('payments')
    .update({
      status,
      verified_at: new Date().toISOString(),
      verified_by: userId
    })
    .eq('id', paymentId)

  if (error) return { error: error.message }

  // If verified, we should also mark registrations as cleared?
  // The requirements say "Payment verification... automatic bracket generation".
  // Maybe we should clear registrations.
  if (status === 'verified') {
    // Get the payment to know tournament and coach
    const { data: payment } = await supabase
      .from('payments')
      .select('tournament_id, coach_user_id')
      .eq('id', paymentId)
      .single()

    if (payment) {
      // Find all athletes for this coach in this tournament
      // First get team id
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('coach_user_id', payment.coach_user_id)
        .single()

      if (team) {
        // Get athletes
        const { data: athletes } = await supabase
          .from('athletes')
          .select('id')
          .eq('team_id', team.id)

        if (athletes && athletes.length > 0) {
          const athleteIds = athletes.map(a => a.id)

          await supabase
            .from('registrations')
            .update({ cleared: true })
            .eq('tournament_id', payment.tournament_id)
            .in('athlete_id', athleteIds)
        }
      }
    }
  }

  revalidatePath('/dashboard/admin/payments')
  return { success: true }
}
