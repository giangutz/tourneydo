export type RealtimeEvent = 'score_update' | 'bracket_update' | 'tournament_update';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEvent;
  tournamentId: string;
  payload: T;
  timestamp: number;
}

export interface BroadcastChannelConfig {
  throttleMs?: number;
}
