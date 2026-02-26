/**
 * CSV Export Utilities
 *
 * Generates RFC 4180-compliant CSV strings from tournament data.
 * No external dependencies required.
 */

function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  // Quote cells that contain comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCell).join(',')
}

// ─── Match Results ─────────────────────────────────────────────────────────────

export interface MatchResultRow {
  matchNumber: string
  round: string
  division: string
  category: string
  player1Name: string
  player1Team: string
  player2Name: string
  player2Team: string
  round1Score1: number | null
  round1Score2: number | null
  round2Score1: number | null
  round2Score2: number | null
  round3Score1: number | null
  round3Score2: number | null
  winnerName: string
  winMethod: string
  winningRound: number | null
}

export function matchResultsToCsv(matches: MatchResultRow[]): string {
  const header = row([
    'Match #', 'Round', 'Division', 'Category',
    'Player 1', 'Team 1', 'Player 2', 'Team 2',
    'R1 P1', 'R1 P2', 'R2 P1', 'R2 P2', 'R3 P1', 'R3 P2',
    'Winner', 'Win Method', 'Winning Round'
  ])

  const rows = matches.map(m => row([
    m.matchNumber, m.round, m.division, m.category,
    m.player1Name, m.player1Team, m.player2Name, m.player2Team,
    m.round1Score1, m.round1Score2, m.round2Score1, m.round2Score2, m.round3Score1, m.round3Score2,
    m.winnerName, m.winMethod, m.winningRound
  ]))

  return [header, ...rows].join('\r\n')
}

// ─── Participant List ──────────────────────────────────────────────────────────

export interface ParticipantRow {
  firstName: string
  lastName: string
  team: string
  coachName: string
  division: string
  category: string
  belt: string
  weight: number | null
  age: number | null
  registrationStatus: string
}

export function participantsToCsv(participants: ParticipantRow[]): string {
  const header = row([
    'First Name', 'Last Name', 'Team / Club', 'Coach',
    'Division', 'Category', 'Belt', 'Weight (kg)', 'Age', 'Status'
  ])

  const rows = participants.map(p => row([
    p.firstName, p.lastName, p.team, p.coachName,
    p.division, p.category, p.belt, p.weight, p.age, p.registrationStatus
  ]))

  return [header, ...rows].join('\r\n')
}
