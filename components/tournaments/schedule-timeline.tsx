'use client'

/**
 * ScheduleTimeline — per-court Gantt visualisation of a (dry-run or live)
 * schedule. Each court is a horizontal lane; matches are positioned bars
 * coloured by belt skill group. Shows hour gridlines, a lunch band, overflow
 * past the configured end time, and highlights athlete double-bookings.
 */

import { useMemo, useState } from 'react'
import {
  buildTimelineModel,
  formatMinuteOfDay,
  hhmmToMinutes,
  TimelineConfig,
} from '@/lib/utils/scheduling/timeline-layout'
import type { SchedulePreviewMatch, SchedulePreviewConfig } from '@/lib/actions/preview-schedule.types'
import type { AthleteClash } from '@/types/models'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ScheduleTimelineProps {
  matches: SchedulePreviewMatch[]
  config: SchedulePreviewConfig
  clashes?: AthleteClash[]
}

const SKILL_STYLES: Record<string, { bar: string; dot: string }> = {
  Beginner: { bar: 'bg-emerald-500/85 hover:bg-emerald-500 text-white', dot: 'bg-emerald-500' },
  Novice: { bar: 'bg-sky-500/85 hover:bg-sky-500 text-white', dot: 'bg-sky-500' },
  'Advanced I': { bar: 'bg-amber-500/85 hover:bg-amber-500 text-white', dot: 'bg-amber-500' },
  'Advanced II': { bar: 'bg-violet-500/85 hover:bg-violet-500 text-white', dot: 'bg-violet-500' },
  Unknown: { bar: 'bg-slate-400/85 hover:bg-slate-400 text-white', dot: 'bg-slate-400' },
}

function skillStyle(skill: string) {
  return SKILL_STYLES[skill] ?? SKILL_STYLES.Unknown
}

export function ScheduleTimeline({ matches, config, clashes = [] }: ScheduleTimelineProps) {
  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.matchId, m])),
    [matches]
  )

  // Match IDs that participate in an athlete double-booking.
  const clashedIds = useMemo(() => {
    const set = new Set<string>()
    for (const c of clashes) for (const ref of c.matches) set.add(ref.matchId)
    return set
  }, [clashes])

  const timelineConfig: TimelineConfig = useMemo(
    () => ({
      courts: config.courts,
      dayStartMin: hhmmToMinutes(config.dailyStartTime?.slice(0, 5) || '09:00'),
      dayEndMin: hhmmToMinutes(config.dailyEndTime?.slice(0, 5) || '18:00'),
      lunch: config.lunchEnabled
        ? {
            startMin: hhmmToMinutes(config.lunchStartTime?.slice(0, 5) || '12:00'),
            endMin: hhmmToMinutes(config.lunchEndTime?.slice(0, 5) || '13:00'),
          }
        : null,
    }),
    [config]
  )

  const model = useMemo(
    () =>
      buildTimelineModel(
        matches.map((m) => ({
          matchId: m.matchId,
          day: m.day,
          court: m.court,
          startMin: m.startMin,
          endMin: m.endMin,
        })),
        timelineConfig
      ),
    [matches, timelineConfig]
  )

  const [activeDay, setActiveDay] = useState<number>(model[0]?.day ?? 1)
  const day = model.find((d) => d.day === activeDay) ?? model[0]

  if (!day) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No scheduled matches to preview.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Day switcher + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {model.length > 1 ? (
          <div className="flex gap-1">
            {model.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDay(d.day)}
                className={cn(
                  'rounded-md border px-3 py-1 text-sm font-medium transition-colors',
                  d.day === activeDay
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                Day {d.day}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm font-medium text-muted-foreground">Day {day.day}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {Object.entries(SKILL_STYLES)
            .filter(([k]) => k !== 'Unknown')
            .map(([skill, s]) => (
              <span key={skill} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-sm', s.dot)} />
                {skill}
              </span>
            ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-muted ring-1 ring-amber-400" />
            Lunch
          </span>
        </div>
      </div>

      {/* Timeline grid */}
      <TooltipProvider delayDuration={100}>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour axis */}
            <div className="flex">
              <div className="w-20 shrink-0" />
              <div className="relative h-6 flex-1">
                {day.hourTicks.map((tick) => {
                  const span = day.axisEndMin - day.axisStartMin
                  const leftPct = ((tick - day.axisStartMin) / span) * 100
                  return (
                    <div
                      key={tick}
                      className="absolute top-0 -translate-x-1/2 text-[10px] font-medium text-muted-foreground"
                      style={{ left: `${leftPct}%` }}
                    >
                      {formatMinuteOfDay(tick)}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Court lanes */}
            <div className="space-y-1.5">
              {day.lanes.map((lane) => (
                <div key={lane.court} className="flex items-stretch">
                  <div className="flex w-20 shrink-0 items-center text-sm font-semibold text-muted-foreground">
                    Court {lane.court}
                  </div>
                  <div className="relative h-10 flex-1 rounded-md border bg-muted/30">
                    {/* Hour gridlines */}
                    {day.hourTicks.map((tick) => {
                      const span = day.axisEndMin - day.axisStartMin
                      const leftPct = ((tick - day.axisStartMin) / span) * 100
                      return (
                        <div
                          key={tick}
                          className="absolute inset-y-0 w-px bg-border/60"
                          style={{ left: `${leftPct}%` }}
                        />
                      )
                    })}

                    {/* Lunch band */}
                    {day.lunch && day.lunch.widthPct > 0 && (
                      <div
                        className="absolute inset-y-0 bg-amber-200/30 ring-1 ring-inset ring-amber-300/40 dark:bg-amber-900/20"
                        style={{ left: `${day.lunch.leftPct}%`, width: `${day.lunch.widthPct}%` }}
                      />
                    )}

                    {/* Match bars */}
                    {lane.bars.map((bar) => {
                      const m = matchById.get(bar.matchId)
                      if (!m) return null
                      const style = skillStyle(m.skillCategory)
                      const isClashed = clashedIds.has(bar.matchId)
                      return (
                        <Tooltip key={bar.matchId}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute inset-y-1 flex items-center overflow-hidden rounded px-1.5 text-[10px] font-semibold shadow-sm transition-colors cursor-default',
                                style.bar,
                                bar.overflow && 'ring-2 ring-red-500',
                                isClashed && 'ring-2 ring-offset-1 ring-amber-500'
                              )}
                              style={{
                                left: `${bar.leftPct}%`,
                                width: `${Math.max(bar.widthPct, 1.4)}%`,
                              }}
                            >
                              <span className="truncate">#{m.matchNumber}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Match #{m.matchNumber}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {m.roundName || `Round`}
                                </Badge>
                              </div>
                              <div className="text-xs">
                                {m.player1Name} <span className="text-muted-foreground">vs</span>{' '}
                                {m.player2Name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {[m.divisionName, m.categoryName].filter(Boolean).join(' · ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Court {m.court} · {formatMinuteOfDay(bar.startMin)}–
                                {formatMinuteOfDay(bar.endMin)}
                              </div>
                              {bar.overflow && (
                                <div className="text-xs font-medium text-red-500">
                                  ⚠ Runs past the daily end time
                                </div>
                              )}
                              {isClashed && (
                                <div className="text-xs font-medium text-amber-600">
                                  ⚠ Athlete double-booked
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
