/**
 * AthleteClashWarning
 *
 * Renders a non-blocking warning when one or more athletes are scheduled in
 * two overlapping matches (cross-division double-booking). Pure presentational
 * component with no hooks or handlers, so it is safe to use from both server
 * components (schedule page) and client components (success dialog).
 */

import { AlertTriangle } from 'lucide-react'
import { AthleteClash } from '@/types/models'
import { cn } from '@/lib/utils'

interface AthleteClashWarningProps {
  clashes: AthleteClash[]
  className?: string
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function AthleteClashWarning({ clashes, className }: AthleteClashWarningProps) {
  if (!clashes || clashes.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {clashes.length} athlete scheduling conflict{clashes.length > 1 ? 's' : ''} detected
          </h4>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
            These athletes are scheduled in two overlapping matches and cannot compete on both
            courts at once. Move a match in the Court Manager or adjust the schedule to resolve.
          </p>

          <ul className="mt-3 space-y-2">
            {clashes.map((clash, i) => {
              const [a, b] = clash.matches
              return (
                <li
                  key={`${clash.playerId}-${a.matchId}-${b.matchId}-${i}`}
                  className="rounded-md border border-amber-200 bg-white/60 p-2.5 text-xs dark:border-amber-900/40 dark:bg-black/20"
                >
                  <div className="font-semibold text-amber-900 dark:text-amber-100">
                    {clash.playerName?.trim() || `Athlete ${clash.playerId.slice(0, 8)}`}
                    <span className="ml-2 font-normal text-amber-700 dark:text-amber-300/80">
                      Day {clash.day} · {clash.overlapMinutes} min overlap
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-amber-800 dark:text-amber-200/90">
                    <span className="whitespace-nowrap">
                      Match #{a.matchNumber} · Court {a.court} ·{' '}
                      {formatTime(a.scheduledStartTime)}–{formatTime(a.scheduledEndTime)}
                    </span>
                    <span className="text-amber-500">overlaps</span>
                    <span className="whitespace-nowrap">
                      Match #{b.matchNumber} · Court {b.court} ·{' '}
                      {formatTime(b.scheduledStartTime)}–{formatTime(b.scheduledEndTime)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
