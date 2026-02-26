/**
 * Schedule Changed Email Template
 *
 * Sent to all coaches with registered athletes after a schedule recalculation.
 */

export function scheduleChangedHtml(params: {
  tournamentName: string
  scheduleUrl: string
}): string {
  const { tournamentName, scheduleUrl } = params
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2 style="color: #3b82f6;">Schedule Updated</h2>
      <p>Hello Coach,</p>
      <p>The match schedule for <strong>${tournamentName}</strong> has been updated.</p>
      <p>Please check the latest schedule for any changes to your athletes' match times or court assignments.</p>
      <div style="margin: 28px 0;">
        <a href="${scheduleUrl}"
           style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
          View Updated Schedule
        </a>
      </div>
      <p style="color:#666;font-size:13px;">
        You are receiving this because you have athletes registered for this tournament.
      </p>
    </div>
  `
}

export function scheduleChangedSubject(tournamentName: string): string {
  return `Schedule updated — ${tournamentName}`
}
