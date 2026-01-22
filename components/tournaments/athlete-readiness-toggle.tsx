/**
 * Athlete Readiness Toggle Component
 * 
 * Allows organizers to mark athletes as called/ready on the bracket page.
 * Visual states: ❌ Not called, ✅ Called/Ready, 🔒 Locked
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { toggleAthleteCalledStatus } from '@/lib/actions/match-readiness'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AthleteReadinessToggleProps {
  matchId: string
  athleteId: string
  athleteName: string
  called: boolean
  disabled: boolean // Disabled if match not CONTEST or already started
  compact?: boolean // Compact mode for smaller displays
}

export function AthleteReadinessToggle({
  matchId,
  athleteId,
  athleteName,
  called,
  disabled,
  compact = false
}: AthleteReadinessToggleProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [localCalled, setLocalCalled] = useState(called)

  const handleToggle = async () => {
    setIsToggling(true)
    const newCalled = !localCalled

    try {
      const result = await toggleAthleteCalledStatus(matchId, athleteId, newCalled)
      
      if (result.success) {
        setLocalCalled(newCalled)
        toast.success(newCalled ? `${athleteName} marked as ready` : `${athleteName} marked as not ready`)
      } else {
        toast.error(result.error || 'Failed to update readiness')
      }
    } catch (error) {
      toast.error('Failed to update readiness')
    } finally {
      setIsToggling(false)
    }
  }

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        compact ? "text-xs" : "text-sm"
      )}>
        <Lock className={cn("text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
        <span className="text-muted-foreground">
          {localCalled ? 'Ready' : 'Not Ready'}
        </span>
      </div>
    )
  }

  if (compact) {
    return (
      <Button
        variant={localCalled ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-6 px-2 text-xs gap-1",
          localCalled && "bg-green-600 hover:bg-green-700"
        )}
        onClick={handleToggle}
        disabled={isToggling}
      >
        {localCalled ? (
          <>
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </>
        ) : (
          <>
            <Circle className="h-3 w-3" />
            Call
          </>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={localCalled ? "default" : "outline"}
      size="sm"
      className={cn(
        "gap-2",
        localCalled && "bg-green-600 hover:bg-green-700"
      )}
      onClick={handleToggle}
      disabled={isToggling}
    >
      {localCalled ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Athlete Ready
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" />
          Call Athlete
        </>
      )}
    </Button>
  )
}

/**
 * Readiness status badge for quick visual indication
 */
interface ReadinessStatusBadgeProps {
  athlete1Called: boolean
  athlete2Called: boolean
  compact?: boolean
}

export function ReadinessStatusBadge({
  athlete1Called,
  athlete2Called,
  compact = false
}: ReadinessStatusBadgeProps) {
  const bothReady = athlete1Called && athlete2Called
  const oneReady = athlete1Called || athlete2Called
  const noneReady = !athlete1Called && !athlete2Called

  if (bothReady) {
    return (
      <Badge variant="default" className={cn("bg-green-600", compact && "text-xs px-1.5 py-0")}>
        <CheckCircle2 className={cn("mr-1", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
        Both Ready
      </Badge>
    )
  }

  if (oneReady) {
    return (
      <Badge variant="secondary" className={cn("bg-yellow-100 text-yellow-800", compact && "text-xs px-1.5 py-0")}>
        ⚠️ One Ready
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("text-muted-foreground", compact && "text-xs px-1.5 py-0")}>
      ⏳ Waiting
    </Badge>
  )
}
