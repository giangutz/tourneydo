'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook for subscribing to realtime tournament updates.
 * 
 * Optimizations:
 * - Uses singleton Supabase client to prevent connection exhaustion
 * - Debounces router.refresh() to max once per 500ms
 * - Proper cleanup on unmount
 */
export function useTournamentRealtime(
  tournamentId: string,
  onMatchUpdate?: (payload: any) => void
) {
  const router = useRouter()

  // Use singleton client - memoized to prevent recreation
  const supabase = useMemo(() => createClient(), [])

  // Debounce refresh to prevent excessive re-renders
  const debouncedRefresh = useDebouncedCallback(
    () => router.refresh(),
    500,
    { maxWait: 2000 }
  )

  useEffect(() => {
    if (!tournamentId) return

    let channel: any = null

    const setupSubscription = () => {
      if (document.hidden) return // Don't subscribe if backgrounded

      channel = supabase
        .channel(`tournament-${tournamentId}`)
        // 1. Matches - Critical High Frequency
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${tournamentId}`
          },
          (payload) => {
            if (onMatchUpdate) {
              // Optimistic UI Update
              onMatchUpdate(payload)
            } else {
              // Fallback to refresh if no handler
              debouncedRefresh()
            }
          }
        )
        // 2. Registrations - Low Frequency (Keep Refresh)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_registrations',
            filter: `tournament_id=eq.${tournamentId}`
          },
          () => debouncedRefresh()
        )
        // 3. Tournament Settings - Rare (Keep Refresh)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournaments',
            filter: `id=eq.${tournamentId}`
          },
          () => debouncedRefresh()
        )
        .subscribe()
    }

    const cleanupSubscription = () => {
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
    }

    // Initial setup
    setupSubscription()

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanupSubscription()
      } else {
        setupSubscription()
        // Refresh to catch up
        debouncedRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cleanupSubscription()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [tournamentId, supabase, debouncedRefresh, onMatchUpdate])
}
