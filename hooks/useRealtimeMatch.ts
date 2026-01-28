'use client';

import { useEffect, useState, useCallback } from 'react';
import { broadcastManager } from '@/lib/realtime/broadcast';
import { RealtimePayload } from '@/lib/realtime/types';
import { initSubscriptionManager } from '@/lib/realtime/subscriptions';

interface MatchState {
  scoreRed: number;
  scoreBlue: number;
  // other fields...
}

export function useRealtimeMatch(tournamentId: string, matchId: string, initialData?: MatchState) {
  const [matchData, setMatchData] = useState<MatchState | undefined>(initialData);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Ensure global subscription manager is monitoring the singleton client
    initSubscriptionManager();

    if (!tournamentId || !matchId) return;

    const unsubscribe = broadcastManager.subscribe(
      tournamentId,
      (payload: any) => { // payload is generic
        // Check if this update is for our match
        if (payload.matchId === matchId) {
          setMatchData(prev => ({
            ...prev,
            ...payload
          }));
        }
      }
    );

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [tournamentId, matchId]);

  const publishScore = useCallback((newScore: Partial<MatchState>) => {
    broadcastManager.publish(tournamentId, 'score_update', {
      matchId,
      ...newScore
    });

    // Optimistic update
    setMatchData(prev => prev ? ({ ...prev, ...newScore }) : undefined);
  }, [tournamentId, matchId]);

  return { matchData, isConnected, publishScore };
}
