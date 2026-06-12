/**
 * Timeline layout model for the per-court schedule Gantt preview.
 *
 * This is a pure, timezone-free module: it operates entirely on
 * minute-of-day integers so positioning is deterministic and unit-testable.
 * The caller (server action / component) is responsible for converting wall
 * times into minute-of-day before handing matches here, which keeps all the
 * timezone reasoning in one place and out of the rendering math.
 */

/** Convert an "HH:MM" string to minutes since midnight. Timezone-free. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Format a minute-of-day integer as a 12-hour label, e.g. 615 -> "10:15 AM". Timezone-free. */
export function formatMinuteOfDay(min: number): string {
  const h24 = Math.floor(min / 60) % 24
  const m = ((min % 60) + 60) % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

export interface TimelineInputMatch {
  matchId: string
  day: number
  court: number
  startMin: number // minute-of-day
  endMin: number // minute-of-day
}

export interface TimelineConfig {
  courts: number
  dayStartMin: number
  dayEndMin: number
  lunch?: { startMin: number; endMin: number } | null
}

export interface TimelineBar {
  matchId: string
  leftPct: number
  widthPct: number
  startMin: number
  endMin: number
  /** True when the match extends past the configured daily end time. */
  overflow: boolean
}

export interface TimelineLane {
  court: number
  bars: TimelineBar[]
}

export interface TimelineDayModel {
  day: number
  axisStartMin: number
  axisEndMin: number
  hourTicks: number[] // minute-of-day at each whole hour within the axis
  lunch: { leftPct: number; widthPct: number } | null
  lanes: TimelineLane[]
}

function clampPct(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

/**
 * Build a per-day, per-court layout model from scheduled matches.
 *
 * - The axis starts at the configured daily start and extends to the later of
 *   the configured daily end or the last match end (so overflow stays visible).
 * - Every configured court gets a lane, even when it has no matches.
 * - Only days that actually contain matches are returned, in ascending order.
 */
export function buildTimelineModel(
  matches: TimelineInputMatch[],
  config: TimelineConfig
): TimelineDayModel[] {
  if (matches.length === 0) return []

  const byDay = new Map<number, TimelineInputMatch[]>()
  for (const match of matches) {
    const list = byDay.get(match.day) ?? []
    list.push(match)
    byDay.set(match.day, list)
  }

  const days = [...byDay.keys()].sort((a, b) => a - b)

  return days.map((day) => {
    const dayMatches = byDay.get(day)!
    const latestEnd = dayMatches.reduce((max, x) => Math.max(max, x.endMin), config.dayEndMin)

    const axisStartMin = config.dayStartMin
    const axisEndMin = Math.max(config.dayEndMin, latestEnd)
    const span = Math.max(1, axisEndMin - axisStartMin)
    const pct = (min: number) => clampPct(((min - axisStartMin) / span) * 100)

    // Hour gridlines at every whole hour inside the axis.
    const hourTicks: number[] = []
    const firstTick = Math.ceil(axisStartMin / 60) * 60
    for (let t = firstTick; t <= axisEndMin; t += 60) hourTicks.push(t)
    if (hourTicks[0] !== axisStartMin) hourTicks.unshift(axisStartMin)

    // One lane per configured court.
    const lanes: TimelineLane[] = []
    for (let court = 1; court <= config.courts; court++) {
      const bars: TimelineBar[] = dayMatches
        .filter((x) => x.court === court)
        .sort((a, b) => a.startMin - b.startMin)
        .map((x) => {
          const leftPct = pct(x.startMin)
          return {
            matchId: x.matchId,
            leftPct,
            widthPct: Math.max(0, pct(x.endMin) - leftPct),
            startMin: x.startMin,
            endMin: x.endMin,
            overflow: x.endMin > config.dayEndMin,
          }
        })
      lanes.push({ court, bars })
    }

    let lunch: { leftPct: number; widthPct: number } | null = null
    if (config.lunch && config.lunch.endMin > config.lunch.startMin) {
      const left = pct(config.lunch.startMin)
      lunch = { leftPct: left, widthPct: Math.max(0, pct(config.lunch.endMin) - left) }
    }

    return { day, axisStartMin, axisEndMin, hourTicks, lunch, lanes }
  })
}
