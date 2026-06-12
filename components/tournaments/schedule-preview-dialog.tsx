'use client'

/**
 * SchedulePreviewDialog — loads a dry-run schedule (no persistence) and renders
 * the per-court Gantt so the organizer can review the whole day before
 * publishing. Publishing is delegated to the parent via onPublish.
 */

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, CalendarRange } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScheduleTimeline } from '@/components/tournaments/schedule-timeline'
import { AthleteClashWarning } from '@/components/tournaments/athlete-clash-warning'
import { previewSchedule } from '@/lib/actions/preview-schedule'
import type { SchedulePreviewData } from '@/lib/actions/preview-schedule.types'

interface SchedulePreviewDialogProps {
  tournamentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublish?: () => void
  isPublishing?: boolean
}

export function SchedulePreviewDialog({
  tournamentId,
  open,
  onOpenChange,
  onPublish,
  isPublishing = false,
}: SchedulePreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SchedulePreviewData | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const result = await previewSchedule(tournamentId)
        if (cancelled) return
        if (result.success) setData(result.data)
        else setError(result.error)
      } catch {
        if (!cancelled) setError('Failed to load schedule preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, tournamentId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-muted-foreground" />
            Schedule Preview
          </DialogTitle>
          <DialogDescription>
            A per-court timeline of how the day will run. Nothing is saved until you publish.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[260px] py-2">
          {loading && (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Computing schedule…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{data.matches.length} matches</Badge>
                <Badge variant="secondary">
                  {data.totalDays} day{data.totalDays > 1 ? 's' : ''}
                </Badge>
                <Badge variant="secondary">{data.config.courts} courts</Badge>
                {data.feasible ? (
                  <Badge className="bg-green-600 text-white hover:bg-green-600">Fits the schedule</Badge>
                ) : (
                  <Badge variant="destructive">
                    {data.overflowCount} match{data.overflowCount !== 1 ? 'es' : ''} overflow
                  </Badge>
                )}
                {data.clashes.length > 0 && (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                    {data.clashes.length} athlete clash{data.clashes.length !== 1 ? 'es' : ''}
                  </Badge>
                )}
              </div>

              {data.clashes.length > 0 && <AthleteClashWarning clashes={data.clashes} />}

              <ScheduleTimeline matches={data.matches} config={data.config} clashes={data.clashes} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onPublish && (
            <Button
              onClick={onPublish}
              disabled={isPublishing || loading || !!error}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                'Publish Schedule'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
