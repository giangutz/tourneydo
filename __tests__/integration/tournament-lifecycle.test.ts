/**
 * End-to-end tournament lifecycle — integration test.
 *
 * Drives the REAL organizer server actions through a complete journey:
 *
 *   createTournament  →  addParticipant ×N  →  bulkWeighIn  →  generateTournamentBracket
 *
 * Only the data-access layer (`lib/db/queries/*`) is faked, via a stateful
 * in-memory DB (see `lifecycle-harness.ts`). Everything the organizer relies on
 * — auth guards, Zod validation, gender/division configuration, weight/height
 * category matching, and the real single-elimination bracket generator — runs
 * for real. This is the regression net for the bugs reported in the field:
 *
 *   • "adding participants doesn't work"      → covered by the Add Participants phase
 *   • tournaments created before the wizard    → covered by tournament-create-wizard.test.tsx
 *     is finished (premature submit)             (component-level); here we assert the action
 *                                                 only persists on a complete, valid payload.
 *
 * Auth is mocked (setMockOrganizer), so there is NO sign-in blocker — this runs
 * deterministically in CI. The real-browser counterpart lives in e2e/.
 */

// ── Mock the data-access layer; the actions themselves stay real ─────────────
jest.mock('@/lib/db/queries/tournaments')
jest.mock('@/lib/db/queries/divisions')
jest.mock('@/lib/db/queries/teams')
jest.mock('@/lib/db/queries/players')
jest.mock('@/lib/db/queries/registrations')
jest.mock('@/lib/db/queries/matches')
jest.mock('@/lib/db/queries/audit-trail')
jest.mock('@/lib/cache/result-cache')
// Factory mock (not automock): the real module instantiates Resend at import
// time, which throws without an API key. A factory keeps that body from loading.
jest.mock('@/lib/email/send-coach-notification', () => ({
  sendBracketPublishedNotification: jest.fn().mockResolvedValue(undefined),
}))

import { createTournament } from '@/lib/actions/tournaments'
import { addParticipant, bulkWeighIn } from '@/lib/actions/participants'
import { generateTournamentBracket } from '@/lib/actions/brackets'

import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import {
  createLifecycleDb,
  wireLifecycleMocks,
  type LifecycleDb,
} from '@/__tests__/utils/lifecycle-harness'

const ORGANIZER_ID = 'test-organizer-id'

// Future, internally-consistent dates (today is 2026-06-12 in this env):
//   end >= start, registration_deadline <= start, weigh_in_end >= weigh_in_start
const DATES = {
  start: '2026-09-01',
  end: '2026-09-02',
  weighInStart: '2026-08-30',
  weighInEnd: '2026-08-31',
  registrationDeadline: '2026-08-20',
}

// ── Builders ─────────────────────────────────────────────────────────────────

function buildTournamentFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const values: Record<string, string> = {
    name: 'Provincial Open 2026',
    tournament_type: 'standard',
    start_date: DATES.start,
    end_date: DATES.end,
    weigh_in_start: DATES.weighInStart,
    weigh_in_end: DATES.weighInEnd,
    venue: 'City Sports Complex',
    registration_deadline: DATES.registrationDeadline,
    entry_fee: '500',
    max_players: '32',
    courts: '2',
    status: 'upcoming',
    gender_preference: 'male',
    division_move_policy: 'allow_move',
    // Only the Senior division is enabled for this tournament.
    divisions: JSON.stringify(['Senior']),
    allowed_belt_groups: JSON.stringify(['Beginner', 'Novice', 'Advanced I', 'Advanced II']),
    ...overrides,
  }
  for (const [key, value] of Object.entries(values)) fd.append(key, value)
  return fd
}

/** A senior (age 26 in 2026) male, 70 kg → Senior division, "Light" category, Novice belt. */
function buildParticipantFormData(
  overrides: Partial<Record<string, string>> = {}
): FormData {
  const fd = new FormData()
  const values: Record<string, string> = {
    firstName: 'Athlete',
    lastName: 'One',
    email: 'athlete.one@example.com',
    teamId: 'team-a',
    beltLevel: 'Blue',
    weight: '70',
    height: '178',
    dob: '2000-01-01',
    gender: 'male',
    ...(overrides as Record<string, string>),
  }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) fd.append(key, value)
  }
  return fd
}

// ── Harness ──────────────────────────────────────────────────────────────────

let db: LifecycleDb

beforeEach(() => {
  db = createLifecycleDb()
  wireLifecycleMocks(db)
  db.seedTeam({ id: 'team-a', name: 'Team A', user_id: 'coach-a' })
  db.seedTeam({ id: 'team-b', name: 'Team B', user_id: 'coach-b' })
  setMockOrganizer(ORGANIZER_ID)
})

afterEach(() => {
  clearMockAuth()
  jest.clearAllMocks()
})

// Convenience: create the standard lifecycle tournament and return its id.
async function createBaseTournament(): Promise<string> {
  const result = await createTournament(null, buildTournamentFormData())
  expect(result.success).toBe(true)
  expect(result.tournamentId).toBeDefined()
  return result.tournamentId!
}

// Convenience: add four senior males across two teams (registrations are verified).
async function addFourParticipants(tournamentId: string): Promise<void> {
  const roster = [
    { firstName: 'Aaron', lastName: 'Reyes', email: 'aaron@example.com', teamId: 'team-a', weight: '70' },
    { firstName: 'Ben', lastName: 'Cruz', email: 'ben@example.com', teamId: 'team-a', weight: '71' },
    { firstName: 'Caleb', lastName: 'Santos', email: 'caleb@example.com', teamId: 'team-b', weight: '72' },
    { firstName: 'Diego', lastName: 'Lim', email: 'diego@example.com', teamId: 'team-b', weight: '69' },
  ]
  for (const r of roster) {
    const result = await addParticipant(tournamentId, null, buildParticipantFormData(r))
    expect(result.success).toBe(true)
  }
}

// =============================================================================
// The happy-path journey
// =============================================================================

describe('Tournament lifecycle — full organizer journey', () => {
  it('walks create → add participants → weigh-in → generate bracket', async () => {
    // ── 1. CREATE ─────────────────────────────────────────────────────────────
    const tournamentId = await createBaseTournament()

    const tournament = db.tournaments.get(tournamentId)!
    expect(tournament.organizer_id).toBe(ORGANIZER_ID)
    expect(tournament.gender_preference).toBe('male')

    // Default divisions were seeded…
    const divisions = db.divisions.filter((d) => d.tournament_id === tournamentId)
    expect(divisions.map((d) => d.name).sort()).toEqual(
      ['Cadet', 'Gradeschool', 'Junior', 'Senior']
    )
    // …only Senior is enabled (the others were disabled per the wizard selection)…
    const enabled = divisions.filter((d) => d.enabled).map((d) => d.name)
    expect(enabled).toEqual(['Senior'])
    // …and the male-only preference stripped every female category.
    const femaleCats = db.categories.filter(
      (c) => c.tournament_id === tournamentId && c.gender === 'female'
    )
    expect(femaleCats).toHaveLength(0)

    // ── 2. ADD PARTICIPANTS ─────────────────────────────────────────────────────
    await addFourParticipants(tournamentId)

    const regs = Array.from(db.registrations.values()).filter(
      (r) => r.tournament_id === tournamentId
    )
    expect(regs).toHaveLength(4)
    // Organizer-added participants are auto-verified and not yet weighed in.
    expect(regs.every((r) => r.status === 'verified')).toBe(true)
    expect(regs.every((r) => r.weighed_in_at === null)).toBe(true)
    expect(db.players.size).toBe(4)

    // ── 3. WEIGH-IN ─────────────────────────────────────────────────────────────
    const result = await bulkWeighIn(
      regs.map((r) => r.id),
      tournamentId
    )
    expect(result.success).toBe(true)

    const weighed = Array.from(db.registrations.values()).filter(
      (r) => r.tournament_id === tournamentId
    )
    expect(weighed.every((r) => r.weighed_in_at !== null)).toBe(true)
    expect(weighed.every((r) => r.actual_weight !== null)).toBe(true)

    // ── 4. GENERATE BRACKET ─────────────────────────────────────────────────────
    const bracketResult = await generateTournamentBracket(tournamentId)
    expect(bracketResult.success).toBe(true)

    // 4 athletes in one division/category/skill group → a single-elimination
    // bracket of 4 → exactly 3 matches (2 semi-finals + 1 final).
    expect(db.matches).toHaveLength(3)

    // Every match is tagged with the resolved Senior / Light / Novice group.
    const senior = db.divisions.find((d) => d.tournament_id === tournamentId && d.name === 'Senior')!
    const light = db.categories.find(
      (c) => c.division_id === senior.id && c.name === 'Light' && c.gender === 'male'
    )!
    expect(db.matches.every((m) => m.division_id === senior.id)).toBe(true)
    expect(db.matches.every((m) => m.category_id === light.id)).toBe(true)
    expect(db.matches.every((m) => m.skill_level === 'Novice')).toBe(true)

    // Exactly one final (the only match with no parent to advance to).
    const finals = db.matches.filter((m) => m.next_match_id === null)
    expect(finals).toHaveLength(1)
    // The two non-final matches both feed the final.
    const nonFinals = db.matches.filter((m) => m.next_match_id !== null)
    expect(nonFinals).toHaveLength(2)
    expect(nonFinals.every((m) => m.next_match_id === finals[0].id)).toBe(true)
  })
})

// =============================================================================
// Guard rails — the failure modes that hurt organizers in the field
// =============================================================================

describe('Tournament lifecycle — create guards', () => {
  it('does NOT persist a tournament when the payload is incomplete', async () => {
    // Mirrors a premature/empty submit: no name, no dates.
    const result = await createTournament(null, new FormData())

    expect(result.success).toBeUndefined()
    expect(result.error).toBe('Validation failed')
    expect(result.fieldErrors).toBeDefined()
    // Nothing was written.
    expect(db.tournaments.size).toBe(0)
    expect(db.divisions).toHaveLength(0)
  })

  it('rejects creation when not authenticated', async () => {
    clearMockAuth()
    const result = await createTournament(null, buildTournamentFormData())
    expect(result.error).toBe('Unauthorized')
    expect(db.tournaments.size).toBe(0)
  })
})

describe('Tournament lifecycle — add-participant guards', () => {
  it('adds a participant successfully with a complete payload', async () => {
    const tournamentId = await createBaseTournament()

    const result = await addParticipant(tournamentId, null, buildParticipantFormData())

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    const regs = Array.from(db.registrations.values())
    expect(regs).toHaveLength(1)
    expect(regs[0].status).toBe('verified')
    expect(regs[0].player_id).toBeDefined()
  })

  it('surfaces a validation error (and writes nothing) for a missing email', async () => {
    const tournamentId = await createBaseTournament()

    const result = await addParticipant(
      tournamentId,
      null,
      buildParticipantFormData({ email: '' })
    )

    expect(result.success).toBeUndefined()
    expect(result.error).toBe('Validation failed')
    expect(result.fieldErrors?.email).toBeDefined()
    // No partial writes: no player, no registration.
    expect(db.players.size).toBe(0)
    expect(db.registrations.size).toBe(0)
  })

  it('requires weight for participants 12 and older', async () => {
    const tournamentId = await createBaseTournament()

    const result = await addParticipant(
      tournamentId,
      null,
      buildParticipantFormData({ weight: '', height: '' })
    )

    expect(result.error).toBe('Validation failed')
    expect(db.registrations.size).toBe(0)
  })

  it('blocks unauthenticated participant adds', async () => {
    const tournamentId = await createBaseTournament()
    clearMockAuth()

    const result = await addParticipant(tournamentId, null, buildParticipantFormData())

    expect(result.error).toBe('Unauthorized')
    expect(db.registrations.size).toBe(0)
  })
})

describe('Tournament lifecycle — bracket guards', () => {
  it('refuses to generate with fewer than 2 verified participants', async () => {
    const tournamentId = await createBaseTournament()
    await addParticipant(tournamentId, null, buildParticipantFormData())
    const reg = Array.from(db.registrations.values())[0]
    await bulkWeighIn([reg.id], tournamentId)

    const result = await generateTournamentBracket(tournamentId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('general')
      expect(result.error).toMatch(/at least 2/i)
    }
    expect(db.matches).toHaveLength(0)
  })

  it('refuses to generate when participants have not weighed in', async () => {
    const tournamentId = await createBaseTournament()
    await addFourParticipants(tournamentId)
    // Intentionally skip bulkWeighIn.

    const result = await generateTournamentBracket(tournamentId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('unweighed')
      expect(result.participants?.length).toBe(4)
    }
    expect(db.matches).toHaveLength(0)
  })

  it('blocks bracket generation when not authenticated', async () => {
    const tournamentId = await createBaseTournament()
    await addFourParticipants(tournamentId)
    await bulkWeighIn(
      Array.from(db.registrations.values()).map((r) => r.id),
      tournamentId
    )
    clearMockAuth()

    const result = await generateTournamentBracket(tournamentId)

    expect(result.success).toBe(false)
    expect(db.matches).toHaveLength(0)
  })
})
