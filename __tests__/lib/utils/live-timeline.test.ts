import {
  buildLiveTimelineMatches,
  LiveTimelineMatchInput,
} from '@/lib/utils/scheduling/live-timeline'

// Build an ISO string from a local wall-clock time so that getHours() round
// trips to the same value in any timezone the test runs in.
function isoAt(h: number, m: number): string {
  return new Date(2026, 2, 1, h, m).toISOString()
}

function row(over: Partial<LiveTimelineMatchInput> & { id: string }): LiveTimelineMatchInput {
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

describe('buildLiveTimelineMatches', () => {
  it('skips rows without a court or schedule', () => {
    const rows = buildLiveTimelineMatches([
      row({ id: 'a', court_number: null, scheduled_start_time: isoAt(10, 0), scheduled_end_time: isoAt(10, 15) }),
      row({ id: 'b', court_number: 1, scheduled_start_time: null, scheduled_end_time: isoAt(10, 15) }),
    ])
    expect(rows).toEqual([])
  })

  it('computes minute-of-day from the scheduled timestamps', () => {
    const rows = buildLiveTimelineMatches([
      row({
        id: 'a',
        court_number: 2,
        day_number: 1,
        scheduled_start_time: isoAt(10, 0),
        scheduled_end_time: isoAt(10, 15),
        match_number_formatted: '201',
        player1_id: 'p1',
        player2_id: 'p2',
      }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      matchId: 'a',
      matchNumber: '201',
      court: 2,
      startMin: 600, // 10:00
      endMin: 615, // 10:15
    })
  })

  it('resolves player names with BYE / TBD fallbacks', () => {
    const rows = buildLiveTimelineMatches([
      row({
        id: 'a',
        scheduled_start_time: isoAt(9, 0),
        scheduled_end_time: isoAt(9, 15),
        player1_id: 'p1',
        player1: { id: 'p1', first_name: 'Jin', last_name: 'Lee' },
        player2_id: 'p2', // id present but no relation -> TBD
      }),
      row({
        id: 'b',
        scheduled_start_time: isoAt(9, 0),
        scheduled_end_time: isoAt(9, 15),
        player1_id: 'p3',
        player1: { id: 'p3', first_name: 'Mia', last_name: 'Park' },
        player2_id: null, // BYE
      }),
    ])
    expect(rows[0].player1Name).toBe('Jin Lee')
    expect(rows[0].player2Name).toBe('TBD')
    expect(rows[1].player2Name).toBe('BYE')
  })

  it('derives skill category from the belt and passes through labels', () => {
    const rows = buildLiveTimelineMatches([
      row({
        id: 'a',
        scheduled_start_time: isoAt(9, 0),
        scheduled_end_time: isoAt(9, 15),
        player1_id: 'p1',
        player1: { id: 'p1', first_name: 'A', last_name: 'B', belt_level: 'Black' },
        tournament_divisions: { name: 'Senior' },
        tournament_categories: { name: 'M -68kg' },
        round_name: 'Quarter-finals',
      }),
    ])
    expect(rows[0].skillCategory).toBe('Advanced II')
    expect(rows[0].divisionName).toBe('Senior')
    expect(rows[0].categoryName).toBe('M -68kg')
    expect(rows[0].roundName).toBe('Quarter-finals')
  })

  it('falls back to numeric match_number when no formatted value exists', () => {
    const rows = buildLiveTimelineMatches([
      row({
        id: 'a',
        match_number: 305,
        match_number_formatted: null,
        scheduled_start_time: isoAt(9, 0),
        scheduled_end_time: isoAt(9, 15),
      }),
    ])
    expect(rows[0].matchNumber).toBe('305')
  })
})
