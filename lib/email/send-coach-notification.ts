/**
 * Coach Notification Dispatcher
 *
 * Fetches the distinct set of coaches registered for a tournament, resolves their
 * email addresses, and sends the given email to each. Failures are logged per
 * address but never thrown — a single bad email address must not abort the batch.
 *
 * Security: This module is server-only (no 'use client'). Import only from
 * server actions, API routes, and cron handlers.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

interface CoachEmailPayload {
  tournamentId: string
  subject: string
  html: string
}

/**
 * Send an email to every distinct coach who has at least one athlete registered
 * for the given tournament. Deduplicates by coach_id.
 *
 * @returns number of emails successfully sent
 */
export async function sendToTournamentCoaches(payload: CoachEmailPayload): Promise<number> {
  const { tournamentId, subject, html } = payload
  const supabase = createServerSupabaseClient()

  // 1. Get distinct coach_ids from tournament registrations
  const { data: registrations, error: regError } = await supabase
    .from('tournament_registrations')
    .select('coach_id')
    .eq('tournament_id', tournamentId)
    .not('coach_id', 'is', null)

  if (regError) {
    logger.error({ error: regError, tournamentId }, 'Failed to fetch registrations for coach notification')
    return 0
  }

  if (!registrations || registrations.length === 0) return 0

  // Deduplicate coach IDs
  const coachIds = [...new Set(registrations.map(r => r.coach_id as string))]

  // 2. Resolve coach emails from users table
  //    Clerk user IDs are stored as strings; the users table maps them to emails.
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_id, email')
    .in('user_id', coachIds)

  if (usersError) {
    logger.error({ error: usersError, tournamentId }, 'Failed to fetch coach user emails')
    return 0
  }

  if (!users || users.length === 0) return 0

  // 3. Send to each coach in parallel (individual errors don't abort the batch)
  let successCount = 0
  await Promise.allSettled(
    users.map(async (user: any) => {
      if (!user.email) return
      const result = await sendEmail(user.email, subject, html)
      if (result.success) {
        successCount++
      } else {
        logger.warn({ coachId: user.id, tournamentId, error: result.error }, 'Failed to send coach notification email')
      }
    })
  )

  return successCount
}

// ─── Convenience helpers called from server actions ──────────────────────────

import { bracketPublishedHtml, bracketPublishedSubject } from './templates/bracket-published'
import { scheduleChangedHtml, scheduleChangedSubject } from './templates/schedule-changed'

/**
 * Notify all coaches that the bracket has been published.
 * Called from `lib/actions/brackets.ts` after `saveBracket` succeeds.
 */
export async function sendBracketPublishedNotification(
  tournamentId: string,
  tournamentName: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const bracketUrl = `${appUrl}/tournaments/${tournamentId}`

  await sendToTournamentCoaches({
    tournamentId,
    subject: bracketPublishedSubject(tournamentName),
    html: bracketPublishedHtml({ tournamentName, bracketUrl }),
  })
}

/**
 * Notify all coaches that the schedule has been updated.
 * Called from `lib/actions/recalculate-schedule.ts` and `regenerate-bracket-schedule.ts`.
 */
export async function sendScheduleChangedNotification(
  tournamentId: string,
  tournamentName: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const scheduleUrl = `${appUrl}/tournaments/${tournamentId}`

  await sendToTournamentCoaches({
    tournamentId,
    subject: scheduleChangedSubject(tournamentName),
    html: scheduleChangedHtml({ tournamentName, scheduleUrl }),
  })
}
