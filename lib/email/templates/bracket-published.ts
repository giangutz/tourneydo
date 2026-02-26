/**
 * Bracket Published Email Template
 *
 * Sent to all coaches with registered athletes when brackets are generated.
 */

export function bracketPublishedHtml(params: {
  tournamentName: string
  bracketUrl: string
}): string {
  const { tournamentName, bracketUrl } = params
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2 style="color: #16a34a;">Brackets Are Live!</h2>
      <p>Hello Coach,</p>
      <p>The brackets for <strong>${tournamentName}</strong> have been published.</p>
      <p>You can now view your athletes' match draw and schedule.</p>
      <div style="margin: 28px 0;">
        <a href="${bracketUrl}"
           style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
          View Brackets
        </a>
      </div>
      <p style="color:#666;font-size:13px;">
        You are receiving this because you have athletes registered for this tournament.
      </p>
    </div>
  `
}

export function bracketPublishedSubject(tournamentName: string): string {
  return `Brackets published — ${tournamentName}`
}
