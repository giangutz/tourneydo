'use client';

import { useEffect, useState } from 'react';
import { broadcastManager } from '@/lib/realtime/broadcast';
import { initSubscriptionManager } from '@/lib/realtime/subscriptions';
import { useRouter } from 'next/navigation';

export function useRealtimeBracket(tournamentId: string) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Ensure subscription manager is running
    initSubscriptionManager();

    if (!tournamentId) return;

    const unsubscribe = broadcastManager.subscribe(
      tournamentId,
      (payload: any) => {
        // Handle bracket update
        console.log('[useRealtimeBracket] Received update:', payload);

        // Debounce refresh
        const timeoutId = setTimeout(() => {
          router.refresh();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    );

    setIsConnected(true);

    // Cleanup function
    return () => {
      unsubscribe();
      setIsConnected(false);
    }
  }, [tournamentId, router]);

  // Revalidate on focus/visibility change to catch up on missed events
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useRealtimeBracket] Tab visible, refreshing data...');
        router.refresh();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [router]);

  return { isConnected };
}
