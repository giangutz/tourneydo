import {
  detectAthleteClashes,
  detectClashesFromScheduledMatches,
  ClashPlayerInfo,
  ScheduledMatchLike,
} from '@/lib/utils/scheduling/clash-detector'
import { MatchAssignment } from '@/types/models'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY1 = '2026-03-01'

function iso(day: string, time: string): string {
  return new Date(`${day}T${time}:00.000Z`).toISOString()
}

function mk(
  matchId: string,
  court: number,
  start: string,
  end: string,
  opts: { day?: number; date?: string } = {}
): MatchAssignment {
  const date = opts.date ?? DAY1
  return {
    matchId,
    matchNumber: `M${court}01`,
    day: opts.day ?? 1,
    court,
    sequence: 1,
    estimatedStartTime: start,
    scheduledStartTime: iso(date, start),
    scheduledEndTime: iso(date, end),
    divisionId: 'div',
    categoryId: 'cat',
  }
}

function players(entries: Record<string, ClashPlayerInfo>): Map<string, ClashPlayerInfo> {
  return new Map(Object.entries(entries))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectAthleteClashes', () => {
  it('returns no clashes when no athlete appears in two matches', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15'),
      mk('m2', 2, '10:00', '10:15'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'c', player2_id: 'd' },
    })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('returns no clash when the same athlete fights back-to-back without overlap', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15'),
      mk('m2', 2, '10:15', '10:30'), // starts exactly when m1 ends (touching, not overlapping)
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'a', player2_id: 'c' },
    })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('detects an athlete double-booked across two overlapping courts', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15'),
      mk('m2', 3, '10:05', '10:20'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'a', player2_id: 'c' }, // 'a' is in both
    })
    const names = new Map([['a', 'Jin Lee']])

    const clashes = detectAthleteClashes(assignments, lookup, names)

    expect(clashes).toHaveLength(1)
    const clash = clashes[0]
    expect(clash.playerId).toBe('a')
    expect(clash.playerName).toBe('Jin Lee')
    expect(clash.day).toBe(1)
    expect(clash.overlapMinutes).toBe(10) // 10:05 -> 10:15
    const matchIds = clash.matches.map((m) => m.matchId).sort()
    expect(matchIds).toEqual(['m1', 'm2'])
    expect(clash.matches[0].court).toBeDefined()
  })

  it('ignores BYE slots (null player ids)', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15'),
      mk('m2', 2, '10:05', '10:20'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: null },
      m2: { player1_id: null, player2_id: null },
    })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('does not confuse two different athletes', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15'),
      mk('m2', 2, '10:05', '10:20'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'c', player2_id: 'd' },
    })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('reports each overlapping pair exactly once', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:30'),
      mk('m2', 2, '10:10', '10:40'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'a', player2_id: 'c' },
    })

    const clashes = detectAthleteClashes(assignments, lookup)
    expect(clashes).toHaveLength(1)
  })

  it('reports all pairwise conflicts when an athlete has three overlapping matches', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:30'),
      mk('m2', 2, '10:10', '10:40'),
      mk('m3', 3, '10:20', '10:50'),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'x' },
      m2: { player1_id: 'a', player2_id: 'y' },
      m3: { player1_id: 'a', player2_id: 'z' },
    })

    const clashes = detectAthleteClashes(assignments, lookup)
    expect(clashes).toHaveLength(3) // C(3,2)
    expect(clashes.every((c) => c.playerId === 'a')).toBe(true)
  })

  it('does not report a clash for matches on different days', () => {
    const assignments = [
      mk('m1', 1, '10:00', '10:15', { day: 1, date: '2026-03-01' }),
      mk('m2', 1, '10:05', '10:20', { day: 2, date: '2026-03-02' }),
    ]
    const lookup = players({
      m1: { player1_id: 'a', player2_id: 'b' },
      m2: { player1_id: 'a', player2_id: 'c' },
    })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('skips assignments with no player lookup entry', () => {
    const assignments = [mk('m1', 1, '10:00', '10:15'), mk('ghost', 2, '10:05', '10:20')]
    const lookup = players({ m1: { player1_id: 'a', player2_id: 'b' } })

    expect(detectAthleteClashes(assignments, lookup)).toEqual([])
  })

  it('returns clashes in deterministic order (by day, then start time)', () => {
    const assignments = [
      mk('late1', 1, '14:00', '14:30'),
      mk('late2', 2, '14:10', '14:40'),
      mk('early1', 1, '09:00', '09:30'),
      mk('early2', 2, '09:10', '09:40'),
    ]
    const lookup = players({
      late1: { player1_id: 'b', player2_id: 'x' },
      late2: { player1_id: 'b', player2_id: 'y' },
      early1: { player1_id: 'a', player2_id: 'p' },
      early2: { player1_id: 'a', player2_id: 'q' },
    })

    const clashes = detectAthleteClashes(assignments, lookup)
    expect(clashes).toHaveLength(2)
    // Earlier clash first
    expect(clashes[0].playerId).toBe('a')
    expect(clashes[1].playerId).toBe('b')
  })
})

describe('detectClashesFromScheduledMatches', () => {
  function row(over: Partial<ScheduledMatchLike> & { id: string }): ScheduledMatchLike {
    return {
      match_number: 101,
      match_number_formatted: null,
      court_number: 1,
      day_number: 1,
      scheduled_start_time: null,
      scheduled_end_time: null,
      player1_id: null,
      player2_id: null,
      ...over,
    }
  }

  it('skips matches that have no court or schedule yet', () => {
    const matches: ScheduledMatchLike[] = [
      row({ id: 'm1', court_number: null, player1_id: 'a', player2_id: 'b' }),
      row({ id: 'm2', scheduled_start_time: null, player1_id: 'a', player2_id: 'c' }),
    ]
    expect(detectClashesFromScheduledMatches(matches)).toEqual([])
  })

  it('detects a clash from persisted, scheduled rows', () => {
    const matches: ScheduledMatchLike[] = [
      row({
        id: 'm1',
        court_number: 1,
        match_number_formatted: '101',
        scheduled_start_time: iso(DAY1, '10:00'),
        scheduled_end_time: iso(DAY1, '10:15'),
        player1_id: 'a',
        player2_id: 'b',
      }),
      row({
        id: 'm2',
        court_number: 3,
        match_number_formatted: '301',
        scheduled_start_time: iso(DAY1, '10:05'),
        scheduled_end_time: iso(DAY1, '10:20'),
        player1_id: 'a',
        player2_id: 'c',
      }),
    ]

    const clashes = detectClashesFromScheduledMatches(matches)
    expect(clashes).toHaveLength(1)
    expect(clashes[0].playerId).toBe('a')
    expect(clashes[0].overlapMinutes).toBe(10)
    expect(clashes[0].matches.map((m) => m.matchNumber).sort()).toEqual(['101', '301'])
  })
})
