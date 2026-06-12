import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartEmptyStateProps {
  icon: LucideIcon
  message: string
  /** Override the default min height to match the surrounding chart/table area. */
  className?: string
}

/**
 * Compact empty state for chart and table cards.
 *
 * Shown when a section has no data yet (e.g. a newly created tournament with no
 * registrations or matches). Keeps a stable min-height so the surrounding layout
 * doesn't jump once real data arrives.
 */
export function ChartEmptyState({ icon: Icon, message, className }: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 text-center',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="max-w-[240px] text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
