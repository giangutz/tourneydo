/**
 * Single-player division support.
 *
 * When a tournament has enough participants overall (≥2) but a particular
 * division/category ends up with exactly ONE athlete, that athlete should get an
 * automatic-win match (no opponent) while other divisions bracket normally.
 *
 * Driven through the REAL bracket action with the in-memory query harness, so
 * the division/category assignment and the single-player auto-advance path run
 * for real. (The previous version mis-used the persistent supabase mock as a
 * queue and predated the weigh-in / age-category requirements.)
 */

jest.mock('@/lib/db/queries/tournaments')
jest.mock('@/lib/db/queries/divisions')
jest.mock('@/lib/db/queries/teams')
jest.mock('@/lib/db/queries/players')
jest.mock('@/lib/db/queries/registrations')
jest.mock('@/lib/db/queries/matches')
jest.mock('@/lib/db/queries/audit-trail')
jest.mock('@/lib/cache/result-cache')
jest.mock('@/lib/email/send-coach-notification', () => ({
  sendBracketPublishedNotification: jest.fn().mockResolvedValue(undefined),
}))

import { createTournament } from '@/lib/actions/tournaments'
import { addParticipant, bulkWeighIn } from '@/lib/actions/participants'
import { generateTournamentBracket } from '@/lib/actions/brackets'
import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { createLifecycleDb, wireLifecycleMocks, type LifecycleDb } from '@/__tests__/utils/lifecycle-harness'

let db: LifecycleDb

function tournamentFormData(): FormData {
  const fd = new FormData()
  const values: Record<string, string> = {
    name: 'Single Player Division Open',
    tournament_type: 'standard',
    start_date: '2026-09-01',
    end_date: '2026-09-02',
    weigh_in_start: '2026-08-30',
    weigh_in_end: '2026-08-31',
    venue: 'Arena',
    registration_deadline: '2026-08-20',
    entry_fee: '0',
    max_players: '32',
    courts: '2',
    status: 'upcoming',
    gender_preference: 'male',
    division_move_policy: 'allow_move',
    // Enable every division so Senior AND Cadet are both available.
    divisions: JSON.stringify(['Gradeschool', 'Cadet', 'Junior', 'Senior']),
    allowed_belt_groups: JSON.stringify(['Beginner', 'Novice', 'Advanced I', 'Advanced II']),
  }
  for (const [k, v] of Object.entries(values)) fd.append(k, v)
  return fd
}

function participantFormData(o: { firstName: string; teamId: string; dob: string; weight: string }): FormData {
  const fd = new FormData()
  const values: Record<string, string> = {
    firstName: o.firstName,
    lastName: 'Athlete',
    email: `${o.firstName.toLowerCase()}@example.com`,
    teamId: o.teamId,
    beltLevel: 'White',
    weight: o.weight,
    height: '160',
    dob: o.dob,
    gender: 'male',
  }
  for (const [k, v] of Object.entries(values)) fd.append(k, v)
  return fd
}

beforeEach(() => {
  db = createLifecycleDb()
  wireLifecycleMocks(db)
  db.seedTeam({ id: 'team-1', name: 'Team 1', user_id: 'coach-1' })
  db.seedTeam({ id: 'team-2', name: 'Team 2', user_id: 'coach-2' })
  setMockOrganizer()
})

afterEach(() => {
  clearMockAuth()
  jest.clearAllMocks()
})

it('gives the lone athlete in a division an automatic-win match', async () => {
  const created = await createTournament(null, tournamentFormData())
  expect(created.success).toBe(true)
  const tournamentId = created.tournamentId!

  // 1 Senior (age 26) alone in Senior/Light, plus 2 Cadets (age 13) in the same
  // Cadet/Bantam category → 3 verified participants total (clears the ≥2 guard).
  await addParticipant(tournamentId, null, participantFormData({ firstName: 'Solo', teamId: 'team-1', dob: '2000-01-01', weight: '70' }))
  await addParticipant(tournamentId, null, participantFormData({ firstName: 'CadetA', teamId: 'team-1', dob: '2013-01-01', weight: '40' }))
  await addParticipant(tournamentId, null, participantFormData({ firstName: 'CadetB', teamId: 'team-2', dob: '2013-01-01', weight: '40' }))

  await bulkWeighIn(
    Array.from(db.registrations.values()).map((r) => r.id),
    tournamentId
  )

  const result = await generateTournamentBracket(tournamentId)
  expect(result.success).toBe(true)

  // Two groups → Senior(1) auto-win match + Cadet(2) contested match = 2 matches.
  expect(db.matches).toHaveLength(2)

  const autoWin = db.matches.find((m) => m.player2_id === null)
  expect(autoWin).toBeDefined()
  expect(autoWin!.winner_id).toBe(autoWin!.player1_id)
  expect(autoWin!.status).toBe('completed')

  const contested = db.matches.find((m) => m.player2_id !== null)
  expect(contested).toBeDefined()
  expect(contested!.winner_id).toBeNull()
  expect(contested!.status).toBe('scheduled')
})

it('rejects bracket generation when the tournament has only one participant', async () => {
  const created = await createTournament(null, tournamentFormData())
  const tournamentId = created.tournamentId!

  await addParticipant(tournamentId, null, participantFormData({ firstName: 'Solo', teamId: 'team-1', dob: '2000-01-01', weight: '70' }))
  await bulkWeighIn(
    Array.from(db.registrations.values()).map((r) => r.id),
    tournamentId
  )

  const result = await generateTournamentBracket(tournamentId)

  // A single total participant can't form a tournament bracket.
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error).toMatch(/at least 2/i)
  expect(db.matches).toHaveLength(0)
})
