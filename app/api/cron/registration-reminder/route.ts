/**
 * Cron: Registration Reminder
 *
 * Runs daily at 08:00 UTC (configured in vercel.json).
 * Finds tournaments whose registration deadline falls within the next 48 hours
 * and sends a reminder email to every distinct coach with registered athletes.
 *
 * Idempotency: Multiple calls on the same day are safe — Resend deduplication
 * is not relied upon; instead the query window is narrow (48 h) and cron fires
 * once per day, so double-send risk is low.
 *
 * Security: Protected by CRON_SECRET header. Vercel injects this automatically
 * for cron invocations; set CRON_SECRET in environment variables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server'
import { sendToTournamentCoaches } from '@/lib/email/send-coach-notification'
import { registrationReminderHtml, registrationReminderSubject } from '@/lib/email/templates/registration-reminder'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Verify Vercel cron authorization
  const secret = request.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleSupabaseClient()
  const now      = new Date()
  const in48h    = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find tournaments with a deadline in the next 48 hours
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, registration_deadline')
    .not('registration_deadline', 'is', null)
    .gte('registration_deadline', now.toISOString())
    .lte('registration_deadline', in48h.toISOString())

  if (error) {
    logger.error({ error }, 'registration-reminder cron: failed to query tournaments')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!tournaments || tournaments.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  let totalSent = 0

  for (const tournament of tournaments) {
    const deadline = new Date(tournament.registration_deadline!).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
    const tournamentUrl = `${appUrl}/tournaments/${tournament.id}`

    const sent = await sendToTournamentCoaches({
      tournamentId: tournament.id,
      subject:      registrationReminderSubject(tournament.name),
      html:         registrationReminderHtml({ tournamentName: tournament.name, registrationDeadline: deadline, tournamentUrl }),
    })

    logger.info({ tournamentId: tournament.id, sent }, 'registration-reminder: emails sent')
    totalSent += sent
  }

  return NextResponse.json({ sent: totalSent, tournaments: tournaments.length })
}
