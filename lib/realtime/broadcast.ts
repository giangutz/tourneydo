import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { RealtimeEvent, RealtimePayload } from './types';
import _ from 'underscore';

type BroadcastCallback<T = any> = (payload: T) => void;

export class BroadcastManager {
  private static instance: BroadcastManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<BroadcastCallback>> = new Map();
  private supabase = createClient();

  private constructor() { }

  public static getInstance(): BroadcastManager {
    if (!BroadcastManager.instance) {
      BroadcastManager.instance = new BroadcastManager();
    }
    return BroadcastManager.instance;
  }

  /**
   * Subscribe to a tournament's broadcast channel.
   * Returns a cleanup function to unsubscribe.
   */
  public subscribe<T>(tournamentId: string, callback: BroadcastCallback<T>): () => void {
    const channelId = `tournament-broadcast-${tournamentId}`;

    // Add subscriber to tracking
    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set());
    }
    this.subscribers.get(channelId)!.add(callback);

    // Initialize channel if needed
    if (!this.channels.has(channelId)) {
      const channel = this.supabase.channel(channelId, {
        config: {
          broadcast: { self: false }
        }
      });

      channel
        .on(
          'broadcast',
          { event: 'update' },
          (event: { payload: RealtimePayload<T> }) => {
            this.notifySubscribers(channelId, event.payload.payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Broadcast] Subscribed to ${channelId}`);
          }
        });

      this.channels.set(channelId, channel);
    }

    // Cleanup function
    return () => {
      const subs = this.subscribers.get(channelId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          // No more subscribers, clean up channel
          this.removeChannel(channelId);
        }
      }
    };
  }

  /**
   * Publish an update to a tournament channel.
   * Throttled to prevent flooding.
   */
  public publish = _.throttle(async <T>(
    tournamentId: string,
    eventType: RealtimeEvent,
    payload: T
  ) => {
    const channelId = `tournament-broadcast-${tournamentId}`;

    // Ensure channel exists before publishing
    let channel = this.channels.get(channelId);
    if (!channel) {
      channel = this.supabase.channel(channelId, {
        config: { broadcast: { self: true } }
      });
      channel.subscribe();
      this.channels.set(channelId, channel);
    }

    const message: RealtimePayload<T> = {
      eventType,
      tournamentId,
      payload,
      timestamp: Date.now()
    };

    await channel.send({
      type: 'broadcast',
      event: 'update',
      payload: message
    });
  }, 1000); // Max 1 message per second per instance call

  private notifySubscribers<T>(channelId: string, payload: T) {
    const subs = this.subscribers.get(channelId);
    if (subs) {
      subs.forEach(callback => callback(payload));
    }
  }

  private async removeChannel(channelId: string) {
    const channel = this.channels.get(channelId);
    if (channel) {
      await this.supabase.removeChannel(channel);
      this.channels.delete(channelId);
      this.subscribers.delete(channelId);
      console.log(`[Broadcast] Unsubscribed from ${channelId}`);
    }
  }
}

export const broadcastManager = BroadcastManager.getInstance();
