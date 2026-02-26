'use client'

/**
 * ConnectionStatus
 *
 * Shows a colour-coded dot indicating the current network state and the number
 * of scores pending in the offline queue. Mounts invisibly on the server and
 * hydrates on the client.
 *
 * States:
 *   Green  — online, no pending queue
 *   Yellow — syncing offline queue after reconnect
 *   Orange — online, N scores queued (rare: queue drain is automatic)
 *   Red    — offline
 */

import { useOfflineSync } from '@/hooks/use-offline-sync'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ConnectionStatus() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync()

  const hasPending = pendingCount > 0

  let color   = 'text-green-500'
  let bgColor = 'bg-green-500'
  let label   = 'Connected'
  let Icon    = Wifi

  if (!isOnline) {
    color   = 'text-red-500'
    bgColor = 'bg-red-500'
    label   = 'Offline'
    Icon    = WifiOff
  } else if (isSyncing) {
    color   = 'text-yellow-500'
    bgColor = 'bg-yellow-500'
    label   = `Syncing ${pendingCount} pending score${pendingCount > 1 ? 's' : ''}…`
    Icon    = RefreshCw
  } else if (hasPending) {
    color   = 'text-orange-500'
    bgColor = 'bg-orange-500'
    label   = `${pendingCount} score${pendingCount > 1 ? 's' : ''} pending sync`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex items-center gap-1.5 cursor-default select-none">
          <span className={`relative flex h-2.5 w-2.5`}>
            {(isOnline && !hasPending && !isSyncing) && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bgColor} opacity-40`} />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${bgColor}`} />
          </span>
          <Icon className={`h-4 w-4 ${color} ${isSyncing ? 'animate-spin' : ''}`} />
          {hasPending && !isSyncing && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
