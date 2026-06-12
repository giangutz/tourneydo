'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabase/client';

/**
 * Granular realtime match updates.
 *
 * Holds a local copy of the server-provided matches and patches a single match
 * in place when a `matches` row UPDATE arrives over Postgres changes — instead
 * of forcing a full `router.refresh()` (server refetch + full re-render) for
 * every score tick / status change, which does not scale to many concurrent
 * admins on large tournaments.
 *
 * Design notes:
 * - Only UPDATE events are patched. Scalar columns (scores, status, winner_id,
 *   court_number, player slots after advancement, etc.) come through on
 *   `payload.new`; joined fields (player1, divisions) are preserved from the
 *   existing object, and display code resolves names from the participants list
 *   anyway, so a patched slot still renders correctly.
 * - INSERT/DELETE (structural changes — bracket generation, deletions) are NOT
 *   patched here; they fall through to the existing admin-channel
 *   `router.refresh()` so the enriched data is refetched.
 * - On each patch we call `onPatched` (wired to `markManualRefresh` from
 *   useAdminChannel) so the admin-channel debounced refresh skips the now-
 *   redundant full reload. The periodic/structural refresh still reconciles, so
 *   a missed/stale patch self-heals.
 * - Whenever the server delivers fresh props (navigation / a real refresh) the
 *   local state re-syncs, so it can never drift permanently.
 */
export function useRealtimeMatches<T extends { id?: string | null }>(
  tournamentId: string,
  initialMatches: T[],
  onPatched?: () => void
): T[] {
  const { session } = useSession();
  const [matches, setMatches] = useState<T[]>(initialMatches);

  // Keep the latest onPatched callback in a ref so the subscription effect
  // (which intentionally does not depend on it) always calls the current one.
  const onPatchedRef = useRef(onPatched);
  useEffect(() => {
    onPatchedRef.current = onPatched;
  }, [onPatched]);

  // Re-sync when the server provides fresh data (router.refresh / navigation).
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    if (!tournamentId || !session) return;

    const client = createClerkSupabaseClient({ session });
    const channel = client
      .channel(`rt-matches-patch-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> & { id?: string };
          if (!row?.id) return;

          let patched = false;
          setMatches((prev) => {
            let changed = false;
            const next = prev.map((m) => {
              if (m.id !== row.id) return m;
              changed = true;
              // Overlay changed scalar columns; keep existing joined fields.
              return { ...m, ...row } as T;
            });
            patched = changed;
            return changed ? next : prev;
          });

          // Suppress the admin-channel's redundant full refresh for this change.
          if (patched) onPatchedRef.current?.();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [tournamentId, session]);

  return matches;
}
