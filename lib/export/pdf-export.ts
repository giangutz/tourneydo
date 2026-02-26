/**
 * PDF Export Utilities
 *
 * Generates a print-ready HTML document served with Content-Disposition: attachment.
 * The browser prompts the user to save it; opening in a PDF-capable viewer or
 * using browser Print → Save as PDF produces a clean document.
 *
 * No server-side PDF library dependency required.
 */

import type { MatchResultRow, ParticipantRow } from './csv-export'

const BASE_STYLES = `
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
  h1   { font-size: 18px; margin-bottom: 4px; }
  h2   { font-size: 13px; margin: 16px 0 6px; color: #444; }
  p    { margin: 2px 0; color: #666; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #111; color: #fff; text-align: left; padding: 5px 6px; font-size: 10px; }
  td { border-bottom: 1px solid #ddd; padding: 4px 6px; font-size: 10px; }
  tr:nth-child(even) td { background: #f8f8f8; }
  @media print {
    @page { margin: 15mm; }
    body  { margin: 0; }
  }
`

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated ${new Date().toLocaleString()}</p>
  ${body}
</body>
</html>`
}

// ─── Match Results PDF ─────────────────────────────────────────────────────────

export function matchResultsToPdf(tournamentName: string, matches: MatchResultRow[]): string {
  const rows = matches.map(m => `
    <tr>
      <td>${m.matchNumber}</td>
      <td>${m.round}</td>
      <td>${m.division} / ${m.category}</td>
      <td>${m.player1Name}<br/><small>${m.player1Team}</small></td>
      <td>${m.player2Name}<br/><small>${m.player2Team}</small></td>
      <td style="text-align:center">${m.round1Score1 ?? '–'}&nbsp;–&nbsp;${m.round1Score2 ?? '–'}</td>
      <td style="text-align:center">${m.round2Score1 ?? '–'}&nbsp;–&nbsp;${m.round2Score2 ?? '–'}</td>
      <td style="text-align:center">${m.round3Score1 ?? '–'}&nbsp;–&nbsp;${m.round3Score2 ?? '–'}</td>
      <td><strong>${m.winnerName || '–'}</strong></td>
      <td>${m.winMethod}${m.winningRound ? ` R${m.winningRound}` : ''}</td>
    </tr>
  `).join('')

  const body = `
    <h2>Match Results — ${tournamentName}</h2>
    <table>
      <thead>
        <tr>
          <th>Match</th><th>Round</th><th>Division / Cat.</th>
          <th>Player 1</th><th>Player 2</th>
          <th>R1</th><th>R2</th><th>R3</th>
          <th>Winner</th><th>Method</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  return htmlPage(`${tournamentName} — Match Results`, body)
}

// ─── Participants PDF ──────────────────────────────────────────────────────────

export function participantsToPdf(tournamentName: string, participants: ParticipantRow[]): string {
  const rows = participants.map(p => `
    <tr>
      <td>${p.firstName} ${p.lastName}</td>
      <td>${p.team}</td>
      <td>${p.coachName}</td>
      <td>${p.division}</td>
      <td>${p.category}</td>
      <td>${p.belt}</td>
      <td style="text-align:center">${p.weight ?? '–'}</td>
      <td style="text-align:center">${p.age ?? '–'}</td>
      <td>${p.registrationStatus}</td>
    </tr>
  `).join('')

  const body = `
    <h2>Participant List — ${tournamentName}</h2>
    <table>
      <thead>
        <tr>
          <th>Athlete</th><th>Team</th><th>Coach</th>
          <th>Division</th><th>Category</th><th>Belt</th>
          <th>Weight</th><th>Age</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `

  return htmlPage(`${tournamentName} — Participants`, body)
}
