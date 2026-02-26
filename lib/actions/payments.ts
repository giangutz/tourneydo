"use server"

import { revalidatePath } from "next/cache"
import { createPayment, createPaymentWithPlayers, updatePaymentStatus, createBulkPayments } from "@/lib/db/queries/payments"
import { PaymentInsert } from "@/types/models"
import { auth } from '@clerk/nextjs/server'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendPaymentApprovalEmail, sendPaymentRejectionEmail } from '@/lib/email'

export async function submitPaymentAction(data: PaymentInsert, path: string) {
  try {
    await createPayment(data)
    revalidatePath(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Submit payment with specific players
 * This is the new player-aware payment submission
 */
export async function submitPaymentWithPlayers(
  data: PaymentInsert,
  playerIds: string[],
  path: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    if (playerIds.length === 0) {
      throw new Error('Please select at least one player')
    }

    await createPaymentWithPlayers(data, playerIds)
    revalidatePath(path)
  })
}

/**
 * Bulk submit payments for multiple teams
 */
export async function submitBulkPayments(
  submissions: { team_id: string; amount: number; playerIds: string[] }[],
  sharedData: { tournament_id: string; coach_id: string; reference_number: string },
  path: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    if (submissions.length === 0) {
      throw new Error('No payments to submit')
    }

    // Transform to DB expected format
    const bulkData = submissions.map(sub => ({
      data: {
        tournament_id: sharedData.tournament_id,
        team_id: sub.team_id,
        coach_id: sharedData.coach_id,
        amount: sub.amount,
        reference_number: sharedData.reference_number,
        status: 'pending' as const
      },
      playerIds: sub.playerIds
    }))

    await createBulkPayments(bulkData)
    revalidatePath(path)
    revalidatePath(routes.coach.payments)
  })
}

export async function verifyPaymentAction(
  paymentId: string,
  status: 'verified' | 'rejected',
  path: string,
  reason?: string
) {
  try {
    await updatePaymentStatus(paymentId, status, reason)
    revalidatePath(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Approve a single payment
 */
export async function approvePayment(paymentId: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // Fetch payment details for email
    const supabase = createServerSupabaseClient()
    const { data: payment, error } = await (supabase as any)
      .from('payments')
      .select(`
        *,
        tournaments (name),
        teams (name, user_id, users (first_name, last_name, email))
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    await updatePaymentStatus(paymentId, 'verified')

    // Send approval email
    if (payment.teams?.users?.email) {
      const coachName = `${payment.teams.users.first_name || ''} ${payment.teams.users.last_name || ''}`.trim() || 'Coach'
      await sendPaymentApprovalEmail({
        email: payment.teams.users.email,
        coachName,
        tournamentName: payment.tournaments?.name || 'Tournament',
        teamName: payment.teams?.name || 'Team',
        amount: payment.amount,
        referenceNumber: payment.reference_number,
      })
    }

    revalidatePath(routes.organizer.dashboard)
  })
}

/**
 * Reject a single payment
 */
export async function rejectPayment(paymentId: string, reason: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')
    if (!reason) throw new Error('Rejection reason is required')

    // Fetch payment details for email
    const supabase = createServerSupabaseClient()
    const { data: payment, error } = await (supabase as any)
      .from('payments')
      .select(`
        *,
        tournaments (name),
        teams (name, user_id, users (first_name, last_name, email))
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    await updatePaymentStatus(paymentId, 'rejected', reason)

    // Send rejection email
    if (payment.teams?.users?.email) {
      const coachName = `${payment.teams.users.first_name || ''} ${payment.teams.users.last_name || ''}`.trim() || 'Coach'
      await sendPaymentRejectionEmail({
        email: payment.teams.users.email,
        coachName,
        tournamentName: payment.tournaments?.name || 'Tournament',
        teamName: payment.teams?.name || 'Team',
        amount: payment.amount,
        referenceNumber: payment.reference_number,
        rejectionReason: reason,
      })
    }

    revalidatePath(routes.organizer.dashboard)
  })
}

/**
 * Bulk approve payments
 */
export async function bulkApprovePayments(paymentIds: string[]): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // Fetch all payments for emails
    const supabase = createServerSupabaseClient()
    const { data: payments } = await (supabase as any)
      .from('payments')
      .select(`
        *,
        tournaments (name),
        teams (name, user_id, users (first_name, last_name, email))
      `)
      .in('id', paymentIds)

    await Promise.all(paymentIds.map(id => updatePaymentStatus(id, 'verified')))

    // Send approval emails
    if (payments) {
      await Promise.all(payments.map(async (payment: any) => {
        if (payment.teams?.users?.email) {
          const coachName = `${payment.teams.users.first_name || ''} ${payment.teams.users.last_name || ''}`.trim() || 'Coach'
          await sendPaymentApprovalEmail({
            email: payment.teams.users.email,
            coachName,
            tournamentName: payment.tournaments?.name || 'Tournament',
            teamName: payment.teams?.name || 'Team',
            amount: payment.amount,
            referenceNumber: payment.reference_number,
          })
        }
      }))
    }

    revalidatePath(routes.organizer.dashboard)
  })
}

/**
 * Bulk reject payments
 */
export async function bulkRejectPayments(paymentIds: string[], reason: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')
    if (!reason) throw new Error('Rejection reason is required')

    // Fetch all payments for emails
    const supabase = createServerSupabaseClient()
    const { data: payments } = await (supabase as any)
      .from('payments')
      .select(`
        *,
        tournaments (name),
        teams (name, user_id, users (first_name, last_name, email))
      `)
      .in('id', paymentIds)

    await Promise.all(paymentIds.map(id => updatePaymentStatus(id, 'rejected', reason)))

    // Send rejection emails
    if (payments) {
      await Promise.all(payments.map(async (payment: any) => {
        if (payment.teams?.users?.email) {
          const coachName = `${payment.teams.users.first_name || ''} ${payment.teams.users.last_name || ''}`.trim() || 'Coach'
          await sendPaymentRejectionEmail({
            email: payment.teams.users.email,
            coachName,
            tournamentName: payment.tournaments?.name || 'Tournament',
            teamName: payment.teams?.name || 'Team',
            amount: payment.amount,
            referenceNumber: payment.reference_number,
            rejectionReason: reason,
          })
        }
      }))
    }

    revalidatePath(routes.organizer.dashboard)
  })
}
