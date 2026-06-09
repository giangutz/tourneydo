'use client'

/**
 * Offline Sync Hook
 *
 * Monitors online status and flushes the offline score queue on reconnection.
 * Also exposes the current queue length so UI can show a pending count badge.
 *
 * Usage:
 *   const { isOnline, pendingCount } = useOfflineSync()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { getAll, dequeue, recordFailure, count } from '@/lib/offline/score-queue'
import { saveMatchScores } from '@/lib/actions/save-match-scores'

export interface OfflineSyncState {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
}

export function useOfflineSync(): OfflineSyncState {
  // Always start as true (matches the server-rendered HTML).
  // The real navigator.onLine value is applied inside useEffect after hydration.
  const [isOnline, setIsOnline]       = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing]     = useState(false)
  const syncInProgress = useRef(false)

  /** Refresh the badge count. */
  const refreshCount = useCallback(async () => {
    try {
      const n = await count()
      setPendingCount(n)
    } catch {
      // IndexedDB unavailable (SSR or private mode) — ignore
    }
  }, [])

  /** Drain the queue in insertion order. */
  const flushQueue = useCallback(async () => {
    if (syncInProgress.current) return
    syncInProgress.current = true
    setIsSyncing(true)

    try {
      const entries = await getAll()
      if (entries.length === 0) return

      toast.info(`Syncing ${entries.length} offline score${entries.length > 1 ? 's' : ''}…`)

      let successCount = 0
      let failCount    = 0

      for (const entry of entries) {
        try {
          const result = await saveMatchScores(
            entry.matchId,
            entry.scores,
            entry.winMethod,
            entry.winningRound,
            entry.winnerId
            // No expectedVersion for offline entries — they may be stale
          )

          if (result.success) {
            await dequeue(entry.id)
            successCount++
          } else {
            await recordFailure(entry.id, result.error ?? 'Unknown error')
            failCount++
          }
        } catch (err) {
          await recordFailure(entry.id, err instanceof Error ? err.message : 'Network error')
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} offline score${successCount > 1 ? 's' : ''} synced.`)
      }
      if (failCount > 0) {
        toast.error(`${failCount} score${failCount > 1 ? 's' : ''} failed to sync — they will retry on next reconnect.`)
      }
    } catch (err) {
    } finally {
      syncInProgress.current = false
      setIsSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  // Track online/offline transitions
  useEffect(() => {
    // Sync to the real value now that we're on the client
    setIsOnline(navigator.onLine)

    const handleOnline  = () => { setIsOnline(true);  flushQueue() }
    const handleOffline = () => { setIsOnline(false) }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial count load
    refreshCount()

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue, refreshCount])

  return { isOnline, pendingCount, isSyncing }
}
