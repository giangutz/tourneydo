'use client';

import { createClient } from '@/lib/supabase/client';

// OPTIMIZATION: Aggressive timeouts for MVP
const INACTIVITY_TIMEOUT = 10 * 1000; // 10 seconds - disconnect when idle
const PAGE_HIDDEN_TIMEOUT = 5 * 1000; // 5 seconds - aggressively disconnect hidden tabs

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED_IDLE' | 'DISCONNECTED_HIDDEN' | 'DISCONNECTED_ERROR';

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private supabase = createClient();
  private inactivityTimer: NodeJS.Timeout | null = null;
  private status: ConnectionStatus = 'CONNECTED';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupVisibilityListener();
      this.setupActivityListeners();
      this.setupSocketListeners();
    }
  }

  public static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  public subscribe(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status); // Initial emit
    return () => this.statusListeners.delete(listener);
  }

  private notifyListeners() {
    this.statusListeners.forEach(listener => listener(this.status));
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setupSocketListeners() {
    // Use stateChangeCallbacks (public API) instead of the internal .socket property
    this.supabase.realtime.stateChangeCallbacks.open.push(() => {
      // Only set to CONNECTED if recovering from an unexpected error
      if (this.status === 'DISCONNECTED_ERROR') {
        this.setStatus('CONNECTED');
      }
    });

    this.supabase.realtime.stateChangeCallbacks.close.push(() => {
      // Only treat as error if we didn't initiate the disconnect
      if (this.status === 'CONNECTED') {
        this.setStatus('DISCONNECTED_ERROR');
      }
    });

    this.supabase.realtime.stateChangeCallbacks.error.push(() => {
      this.setStatus('DISCONNECTED_ERROR');
    });
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // OPTIMIZATION: Disconnect hidden tabs faster (5s timeout)
        this.setStatus('DISCONNECTED_HIDDEN');
        setTimeout(() => {
          if (document.hidden) {
            this.disconnect();
          }
        }, PAGE_HIDDEN_TIMEOUT);
      } else {
        // Coming back to visible - reconnect immediately
        this.setStatus('CONNECTED');
        this.reconnect();
      }
    });
  }

  private setupActivityListeners() {
    const resetTimer = () => this.resetInactivityTimer();

    // throttle activity updates to avoid performance hit
    let lastActivity = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 1000) {
        resetTimer();
        lastActivity = now;
      }
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    // Initial timer
    this.resetInactivityTimer();
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Only set timer if tab is visible and we are not already idle
    if (!document.hidden) {
      this.inactivityTimer = setTimeout(() => {
        this.setStatus('DISCONNECTED_IDLE');
        this.disconnect();
      }, INACTIVITY_TIMEOUT);
    }

    // If we were disconnected due to inactivity (but tab is visible), reconnect
    if (this.status === 'DISCONNECTED_IDLE' && !document.hidden) {
      this.setStatus('CONNECTED');
      this.reconnect();
    }
  }

  public async disconnect() {
    await this.supabase.realtime.disconnect();
  }

  public async reconnect() {
    await this.supabase.realtime.connect();
    // Reset timer on reconnect
    this.resetInactivityTimer();
  }
}

// Initialize on client side only
export const initSubscriptionManager = () => {
  if (typeof window !== 'undefined') {
    return SubscriptionManager.getInstance();
  }
};
