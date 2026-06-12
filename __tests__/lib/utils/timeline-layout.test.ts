import {
  hhmmToMinutes,
  formatMinuteOfDay,
  buildTimelineModel,
  TimelineInputMatch,
  TimelineConfig,
} from '@/lib/utils/scheduling/timeline-layout'

// 09:00 -> 18:00 = 540 min span
const CONFIG: TimelineConfig = {
  courts: 2,
  dayStartMin: hhmmToMinutes('09:00'), // 540
  dayEndMin: hhmmToMinutes('18:00'), // 1080
  lunch: { startMin: hhmmToMinutes('12:00'), endMin: hhmmToMinutes('13:00') },
}

function m(
  matchId: string,
  court: number,
  startMin: number,
  endMin: number,
  day = 1
): TimelineInputMatch {
  return { matchId, court, startMin, endMin, day }
}

describe('hhmmToMinutes', () => {
  it('converts HH:MM to minutes of day', () => {
    expect(hhmmToMinutes('00:00')).toBe(0)
    expect(hhmmToMinutes('09:00')).toBe(540)
    expect(hhmmToMinutes('12:30')).toBe(750)
    expect(hhmmToMinutes('18:00')).toBe(1080)
  })
})

describe('formatMinuteOfDay', () => {
  it('formats minute-of-day as a 12-hour label', () => {
    expect(formatMinuteOfDay(0)).toBe('12:00 AM')
    expect(formatMinuteOfDay(540)).toBe('9:00 AM')
    expect(formatMinuteOfDay(615)).toBe('10:15 AM')
    expect(formatMinuteOfDay(720)).toBe('12:00 PM')
    expect(formatMinuteOfDay(1095)).toBe('6:15 PM')
  })
})

describe('buildTimelineModel', () => {
  it('returns no days when there are no matches', () => {
    expect(buildTimelineModel([], CONFIG)).toEqual([])
  })

  it('positions a match as a percentage of the day axis', () => {
    const model = buildTimelineModel([m('a', 1, 600, 615)], CONFIG) // 10:00–10:15
    expect(model).toHaveLength(1)
    const lane = model[0].lanes.find((l) => l.court === 1)!
    expect(lane.bars).toHaveLength(1)
    const bar = lane.bars[0]
    // span = 1080 - 540 = 540; left = (600-540)/540*100 = 11.111
    expect(bar.leftPct).toBeCloseTo(11.111, 2)
    // width = (615-600)/540*100 = 2.777
    expect(bar.widthPct).toBeCloseTo(2.777, 2)
    expect(bar.overflow).toBe(false)
  })

  it('includes an empty lane for every configured court', () => {
    const model = buildTimelineModel([m('a', 1, 600, 615)], CONFIG)
    expect(model[0].lanes.map((l) => l.court)).toEqual([1, 2])
    expect(model[0].lanes.find((l) => l.court === 2)!.bars).toEqual([])
  })

  it('flags overflow and extends the axis past the configured end', () => {
    // match ends at 19:00 (1140), past 18:00 (1080)
    const model = buildTimelineModel([m('a', 1, 1110, 1140)], CONFIG)
    const bar = model[0].lanes.find((l) => l.court === 1)!.bars[0]
    expect(bar.overflow).toBe(true)
    expect(model[0].axisEndMin).toBe(1140)
  })

  it('groups matches by day in ascending order', () => {
    const model = buildTimelineModel(
      [m('a', 1, 600, 615, 2), m('b', 1, 600, 615, 1)],
      CONFIG
    )
    expect(model.map((d) => d.day)).toEqual([1, 2])
  })

  it('sorts bars within a lane by start time', () => {
    const model = buildTimelineModel(
      [m('late', 1, 700, 715), m('early', 1, 600, 615)],
      CONFIG
    )
    const bars = model[0].lanes.find((l) => l.court === 1)!.bars
    expect(bars.map((b) => b.matchId)).toEqual(['early', 'late'])
  })

  it('computes the lunch band position', () => {
    const model = buildTimelineModel([m('a', 1, 600, 615)], CONFIG)
    const lunch = model[0].lunch!
    // 12:00 = 720 -> (720-540)/540*100 = 33.333 ; 13:00 = 780 -> width 60/540*100 = 11.111
    expect(lunch.leftPct).toBeCloseTo(33.333, 2)
    expect(lunch.widthPct).toBeCloseTo(11.111, 2)
  })

  it('omits the lunch band when disabled', () => {
    const model = buildTimelineModel([m('a', 1, 600, 615)], { ...CONFIG, lunch: null })
    expect(model[0].lunch).toBeNull()
  })

  it('emits hour ticks across the axis', () => {
    const model = buildTimelineModel([m('a', 1, 600, 615)], CONFIG)
    // axis 540..1080 -> ticks at 540,600,...,1080
    expect(model[0].hourTicks[0]).toBe(540)
    expect(model[0].hourTicks[model[0].hourTicks.length - 1]).toBe(1080)
    expect(model[0].hourTicks).toContain(720)
  })
})
