'use client';

import { useEffect, useState, useRef, useTransition, useCallback } from 'react';
import { useSession } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useAdminChannel(tournamentId: string) {
  const { session } = useSession();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastManualRefresh = useRef<number>(0);

  /**
   * Called by components BEFORE their own `router.refresh()` so
   * the realtime listener skips the redundant follow-up refresh.
   */
  const markManualRefresh = useCallback(() => {
    lastManualRefresh.current = Date.now();
  }, []);

  const debouncedRefresh = useCallback(() => {
    // Skip if a manual refresh happened recently (within 2s)
    if (Date.now() - lastManualRefresh.current < 2000) return;

    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    refreshTimeout.current = setTimeout(() => {
      console.log('[AdminChannel] Debounced refresh triggering...');
      startTransition(() => {
        router.refresh();
      });
      refreshTimeout.current = null;
    }, 200);
  }, [router, startTransition]);

  useEffect(() => {
    if (!tournamentId || !session) return;

    // Create a dedicated client for this admin connection
    const client = createClerkSupabaseClient({ session });
    let channel: any = null;

    const setupConnection = () => {
      if (document.hidden) return;

      // Subscribe to all changes for this tournament
      channel = client.channel(`admin-tournament-${tournamentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${tournamentId}`
          },
          () => {
            console.log('[AdminChannel] Match update received, scheduling refresh...');
            debouncedRefresh();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_registrations',
            filter: `tournament_id=eq.${tournamentId}`
          },
          () => {
            console.log('[AdminChannel] Registration update received, scheduling refresh...');
            debouncedRefresh();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          }
        });
    };

    const cleanupConnection = async () => {
      if (channel) {
        await client.removeChannel(channel);
        channel = null;
      }
      setIsConnected(false);
    }

    // Initial setup
    setupConnection();

    // Handle visibility to save costs (disconnect when tab hidden)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('[AdminChannel] Tab hidden, disconnecting...');
        await cleanupConnection();
        // Also disconnect the socket to be sure
        client.realtime.disconnect();
      } else {
        console.log('[AdminChannel] Tab visible, reconnecting...');
        // Client.realtime.connect() is automatic when subscribing,
        // but since we might have disconnected the socket:
        client.realtime.connect();
        setupConnection();
        startTransition(() => {
          router.refresh(); // Catch up
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
      cleanupConnection();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      client.realtime.disconnect(); // Ensure socket is closed on unmount
    };
  }, [tournamentId, session, router, debouncedRefresh, startTransition]);

  return { isConnected, isPending, markManualRefresh };
}
