/**
 * Registration Reminder Email Template
 *
 * Sent to coaches 2 days before a tournament's registration deadline.
 */

export function registrationReminderHtml(params: {
  tournamentName: string
  registrationDeadline: string   // Human-readable date string
  tournamentUrl: string
}): string {
  const { tournamentName, registrationDeadline, tournamentUrl } = params
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2 style="color: #f59e0b;">Registration Closes in 2 Days</h2>
      <p>Hello Coach,</p>
      <p>This is a reminder that registration for <strong>${tournamentName}</strong> closes on
         <strong>${registrationDeadline}</strong>.</p>
      <p>Please ensure all your athletes are registered before the deadline.</p>
      <div style="margin: 28px 0;">
        <a href="${tournamentUrl}"
           style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
          View Tournament
        </a>
      </div>
      <p style="color:#666;font-size:13px;">
        You are receiving this because you have athletes registered for this tournament.
      </p>
    </div>
  `
}

export function registrationReminderSubject(tournamentName: string): string {
  return `Registration closes in 2 days — ${tournamentName}`
}
