/**
 * In-memory DB harness for the tournament-lifecycle integration test.
 *
 * The real server actions (createTournament, addParticipant, bulkWeighIn,
 * generateTournamentBracket) are exercised end-to-end, but their data-access
 * layer (`lib/db/queries/*`) is replaced with stateful in-memory fakes wired
 * here. State persists across the journey, so each step observes the effects
 * of the previous one — exactly like a real database, minus Postgres/RLS.
 *
 * Why this layer (and not the raw Supabase client): the queue-based supabase
 * mock is order-sensitive and brittle across a multi-step flow that fires many
 * queries. Faking the query modules keeps the ACTION orchestration real (auth,
 * Zod validation, division/category matching, the real bracket generator) while
 * giving us deterministic, readable persistence.
 *
 * Usage (in a test file):
 *   jest.mock('@/lib/db/queries/tournaments')
 *   jest.mock('@/lib/db/queries/divisions')
 *   ...one jest.mock(...) per module below...
 *   import { createLifecycleDb, wireLifecycleMocks } from '@/__tests__/utils/lifecycle-harness'
 *   const db = createLifecycleDb()
 *   beforeEach(() => { db.reset(); wireLifecycleMocks(db) })
 */

import type { DivisionConfig } from '@/lib/constants/divisions'

// The query modules below MUST be jest.mock()'d by the importing test file.
// Importing them here yields the mocked (jest.fn) exports, which we then drive
// with stateful implementations.
import * as tournamentsQ from '@/lib/db/queries/tournaments'
import * as divisionsQ from '@/lib/db/queries/divisions'
import * as teamsQ from '@/lib/db/queries/teams'
import * as playersQ from '@/lib/db/queries/players'
import * as registrationsQ from '@/lib/db/queries/registrations'
import * as matchesQ from '@/lib/db/queries/matches'
import * as auditQ from '@/lib/db/queries/audit-trail'
import * as cacheQ from '@/lib/cache/result-cache'
import * as emailQ from '@/lib/email/send-coach-notification'

// ─── In-memory shapes (only the fields the actions actually read) ────────────

export interface MemTournament {
  id: string
  name: string
  organizer_id: string
  status: string
  tournament_type: string
  gender_preference: 'mixed' | 'male' | 'female'
  allowed_belt_groups: string[] | null
  division_move_policy: string
  [key: string]: unknown
}

export interface MemDivision {
  id: string
  tournament_id: string
  name: string
  min_age: number | null
  max_age: number | null
  enabled: boolean
}

export interface MemCategory {
  id: string
  tournament_id: string
  division_id: string
  name: string
  gender: 'male' | 'female' | 'both'
  min_weight: number | null
  max_weight: number | null
  min_height: number | null
  max_height: number | null
}

export interface MemPlayer {
  id: string
  first_name: string
  last_name: string
  email: string
  coach_id: string
  belt_level: string
  weight: number | null
  height: number | null
  dob: string
  gender: 'male' | 'female'
}

export interface MemTeam {
  id: string
  name: string
  user_id: string
}

export interface MemRegistration {
  id: string
  tournament_id: string
  team_id: string
  player_id: string
  coach_id: string
  status: string
  disqualified: boolean
  weighed_in_at: string | null
  weighed_in_by: string | null
  actual_weight: number | null
  actual_height: number | null
  division_id: string | null
  category_id: string | null
}

export interface MemMatch {
  id: string
  tournament_id: string
  round: number
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  status: string
  next_match_id: string | null
  division_id?: string | null
  category_id?: string | null
  skill_level?: string | null
  [key: string]: unknown
}

export interface LifecycleDb {
  tournaments: Map<string, MemTournament>
  divisions: MemDivision[]
  categories: MemCategory[]
  players: Map<string, MemPlayer>
  teams: Map<string, MemTeam>
  registrations: Map<string, MemRegistration>
  matches: MemMatch[]
  /** Reset all state and reseed default teams. */
  reset: () => void
  /** Register a team so addParticipant's getTeamById lookup succeeds. */
  seedTeam: (team: MemTeam) => void
  /** Registrations enriched with their player — the shape the bracket action reads. */
  participantsFor: (tournamentId: string) => Array<MemRegistration & { player: MemPlayer | null }>
}

// ─── DB factory ──────────────────────────────────────────────────────────────

let idCounter = 0
const nextId = (prefix: string) => `${prefix}-${++idCounter}`

export function createLifecycleDb(): LifecycleDb {
  const db: LifecycleDb = {
    tournaments: new Map(),
    divisions: [],
    categories: [],
    players: new Map(),
    teams: new Map(),
    registrations: new Map(),
    matches: [],
    reset() {
      idCounter = 0
      db.tournaments.clear()
      db.divisions.length = 0
      db.categories.length = 0
      db.players.clear()
      db.teams.clear()
      db.registrations.clear()
      db.matches.length = 0
    },
    seedTeam(team) {
      db.teams.set(team.id, team)
    },
    participantsFor(tournamentId) {
      return Array.from(db.registrations.values())
        .filter((r) => r.tournament_id === tournamentId)
        .map((r) => ({ ...r, player: db.players.get(r.player_id) ?? null }))
    },
  }
  return db
}

// ─── Wiring: point each mocked query export at the in-memory db ──────────────

/**
 * Returns a division enriched with its current (post-gender-filter) categories,
 * matching the nested `tournament_categories` shape the actions consume.
 */
function enrichDivision(db: LifecycleDb, division: MemDivision) {
  return {
    ...division,
    tournament_categories: db.categories
      .filter((c) => c.division_id === division.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        gender: c.gender,
        min_weight: c.min_weight,
        max_weight: c.max_weight,
        min_height: c.min_height,
        max_height: c.max_height,
      })),
  }
}

export function wireLifecycleMocks(db: LifecycleDb): void {
  const m = (fn: unknown) => fn as jest.Mock

  // ── tournaments ────────────────────────────────────────────────────────────
  m(tournamentsQ.createTournament).mockImplementation(async (data: Partial<MemTournament>) => {
    const id = nextId('tour')
    const tournament: MemTournament = {
      name: String(data.name ?? ''),
      organizer_id: String(data.organizer_id ?? ''),
      status: String(data.status ?? 'upcoming'),
      tournament_type: String(data.tournament_type ?? 'standard'),
      gender_preference: (data.gender_preference as MemTournament['gender_preference']) ?? 'mixed',
      allowed_belt_groups: (data.allowed_belt_groups as string[] | null) ?? null,
      division_move_policy: String(data.division_move_policy ?? 'allow_move'),
      ...data,
      id, // generated id is authoritative (overrides anything in ...data)
    }
    db.tournaments.set(id, tournament)
    return { id }
  })

  m(tournamentsQ.getTournamentById).mockImplementation(async (id: string) => {
    return db.tournaments.get(id) ?? null
  })

  m(tournamentsQ.updateTournament).mockImplementation(async (id: string, data: Partial<MemTournament>) => {
    const existing = db.tournaments.get(id)
    if (existing) db.tournaments.set(id, { ...existing, ...data, id })
    return { id }
  })

  m(tournamentsQ.deleteTournament).mockImplementation(async (id: string) => {
    db.tournaments.delete(id)
  })

  if (tournamentsQ.getTournamentDivisionPolicy) {
    m(tournamentsQ.getTournamentDivisionPolicy).mockImplementation(async (id: string) => {
      return db.tournaments.get(id)?.division_move_policy ?? 'allow_move'
    })
  }

  // ── divisions ──────────────────────────────────────────────────────────────
  m(divisionsQ.ensureTournamentDivisionsAndCategories).mockImplementation(
    async (tournamentId: string, configs: DivisionConfig[]) => {
      for (const cfg of configs) {
        // idempotent: skip a division name already present for this tournament
        const exists = db.divisions.some(
          (d) => d.tournament_id === tournamentId && d.name === cfg.name
        )
        if (exists) continue

        const divisionId = nextId('div')
        db.divisions.push({
          id: divisionId,
          tournament_id: tournamentId,
          name: cfg.name,
          min_age: cfg.minAge,
          max_age: cfg.maxAge,
          enabled: true,
        })
        for (const cat of cfg.categories) {
          db.categories.push({
            id: nextId('cat'),
            tournament_id: tournamentId,
            division_id: divisionId,
            name: cat.name,
            gender: cat.gender,
            min_weight: cat.minWeight ?? null,
            max_weight: cat.maxWeight ?? null,
            min_height: cat.minHeight ?? null,
            max_height: cat.maxHeight ?? null,
          })
        }
      }
    }
  )

  m(divisionsQ.removeCategoriesByGender).mockImplementation(
    async (tournamentId: string, gender: 'male' | 'female') => {
      db.categories = db.categories.filter(
        (c) => !(c.tournament_id === tournamentId && c.gender === gender)
      )
    }
  )

  m(divisionsQ.getAllTournamentDivisions).mockImplementation(async (tournamentId: string) => {
    return db.divisions
      .filter((d) => d.tournament_id === tournamentId)
      .map((d) => enrichDivision(db, d))
  })

  m(divisionsQ.getTournamentDivisions).mockImplementation(async (tournamentId: string) => {
    return db.divisions
      .filter((d) => d.tournament_id === tournamentId)
      .map((d) => enrichDivision(db, d))
  })

  m(divisionsQ.updateDivisionStatus).mockImplementation(async (divisionId: string, enabled: boolean) => {
    const div = db.divisions.find((d) => d.id === divisionId)
    if (div) div.enabled = enabled
  })

  if (divisionsQ.restoreDefaultCategoriesSafely) {
    m(divisionsQ.restoreDefaultCategoriesSafely).mockImplementation(async () => {
      /* no-op: lifecycle does not exercise gender-restore during update */
    })
  }

  m(divisionsQ.batchAssignParticipantDivisions).mockImplementation(
    async (assignments: Array<{ registrationId: string; divisionId: string; categoryId: string }>) => {
      for (const a of assignments) {
        const reg = db.registrations.get(a.registrationId)
        if (reg) {
          reg.division_id = a.divisionId
          reg.category_id = a.categoryId
        }
      }
    }
  )

  if (divisionsQ.assignParticipantDivision) {
    m(divisionsQ.assignParticipantDivision).mockImplementation(
      async (registrationId: string, divisionId: string, categoryId: string) => {
        const reg = db.registrations.get(registrationId)
        if (reg) {
          reg.division_id = divisionId
          reg.category_id = categoryId
        }
      }
    )
  }

  // ── teams ──────────────────────────────────────────────────────────────────
  m(teamsQ.getTeamById).mockImplementation(async (id: string) => db.teams.get(id) ?? null)
  m(teamsQ.addPlayerToTeam).mockImplementation(async () => {
    /* membership is implicit in this harness */
  })

  // ── players ────────────────────────────────────────────────────────────────
  m(playersQ.createPlayer).mockImplementation(async (data: Partial<MemPlayer>) => {
    const id = nextId('player')
    const player: MemPlayer = {
      id,
      first_name: String(data.first_name ?? ''),
      last_name: String(data.last_name ?? ''),
      email: String(data.email ?? ''),
      coach_id: String(data.coach_id ?? ''),
      belt_level: String(data.belt_level ?? ''),
      weight: (data.weight as number | null) ?? null,
      height: (data.height as number | null) ?? null,
      dob: String(data.dob ?? ''),
      gender: (data.gender as 'male' | 'female') ?? 'male',
    }
    db.players.set(id, player)
    return player
  })

  m(playersQ.updatePlayer).mockImplementation(async (id: string, data: Partial<MemPlayer>) => {
    const existing = db.players.get(id)
    if (existing) db.players.set(id, { ...existing, ...data, id })
    return db.players.get(id)
  })

  // ── registrations ──────────────────────────────────────────────────────────
  m(registrationsQ.createRegistration).mockImplementation(async (data: Partial<MemRegistration>) => {
    const id = nextId('reg')
    db.registrations.set(id, {
      id,
      tournament_id: String(data.tournament_id ?? ''),
      team_id: String(data.team_id ?? ''),
      player_id: String(data.player_id ?? ''),
      coach_id: String(data.coach_id ?? ''),
      status: String(data.status ?? 'pending'),
      disqualified: Boolean(data.disqualified ?? false),
      weighed_in_at: (data.weighed_in_at as string | null) ?? null,
      weighed_in_by: (data.weighed_in_by as string | null) ?? null,
      actual_weight: (data.actual_weight as number | null) ?? null,
      actual_height: (data.actual_height as number | null) ?? null,
      division_id: (data.division_id as string | null) ?? null,
      category_id: (data.category_id as string | null) ?? null,
    })
  })

  m(registrationsQ.getTournamentParticipants).mockImplementation(async (tournamentId: string) => {
    const data = db.participantsFor(tournamentId)
    return { data, count: data.length, page: 1, totalPages: 1 }
  })

  if (registrationsQ.getRegistrationById) {
    m(registrationsQ.getRegistrationById).mockImplementation(async (id: string) => {
      const reg = db.registrations.get(id)
      if (!reg) throw new Error(`Registration ${id} not found`)
      return { ...reg, player: db.players.get(reg.player_id) ?? null }
    })
  }

  if (registrationsQ.updateWeighIn) {
    m(registrationsQ.updateWeighIn).mockImplementation(
      async (id: string, weight: number | null, height: number | null, userId: string) => {
        const reg = db.registrations.get(id)
        if (reg) {
          reg.actual_weight = weight
          reg.actual_height = height
          reg.weighed_in_at = new Date().toISOString()
          reg.weighed_in_by = userId
        }
      }
    )
  }

  if (registrationsQ.updateRegistrationStatus) {
    m(registrationsQ.updateRegistrationStatus).mockImplementation(
      async (id: string, patch: { status?: string }) => {
        const reg = db.registrations.get(id)
        if (reg && patch.status) reg.status = patch.status
      }
    )
  }

  // ── matches ────────────────────────────────────────────────────────────────
  m(matchesQ.saveBracket).mockImplementation(async (tournamentId: string, matches: MemMatch[]) => {
    db.matches = matches.map((mm) => ({ ...mm }))
  })

  if (matchesQ.deleteTournamentMatches) {
    m(matchesQ.deleteTournamentMatches).mockImplementation(async (tournamentId: string) => {
      db.matches = db.matches.filter((mm) => mm.tournament_id !== tournamentId)
    })
  }

  // ── side-effect modules (audit / cache / email) ──────────────────────────────
  m(auditQ.createAuditEntry).mockResolvedValue(undefined)
  m(cacheQ.invalidateMatchesCache).mockReturnValue(undefined)
  m(emailQ.sendBracketPublishedNotification).mockResolvedValue(undefined)
}
