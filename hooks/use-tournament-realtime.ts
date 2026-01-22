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
export function useTournamentRealtime(tournamentId: string) {
  const router = useRouter()

  // Use singleton client - memoized to prevent recreation
  const supabase = useMemo(() => createClient(), [])

  // Debounce refresh to prevent excessive re-renders
  // maxWait ensures updates aren't delayed indefinitely during rapid changes
  const debouncedRefresh = useDebouncedCallback(
    () => router.refresh(),
    500,
    { maxWait: 2000 }
  )

  useEffect(() => {
    if (!tournamentId) return

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => debouncedRefresh()
      )
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, supabase, debouncedRefresh])
}
