'use client';

import { createClient } from '@/lib/supabase/client';


const INACTIVITY_TIMEOUT = 1 * 30 * 1000; // 30 seconds

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
      console.log(`[SubscriptionManager] Status changed: ${newStatus}`);
      this.notifyListeners();
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setupSocketListeners() {
    // Get the underlying Phoenix socket
    const socket = (this.supabase.realtime as any).socket;

    if (socket) {
      // Listen for socket connection events
      socket.onOpen(() => {
        // Only set to CONNECTED if we intended to be connected
        if (this.status === 'DISCONNECTED_ERROR') {
          this.setStatus('CONNECTED');
        }
      });

      socket.onClose(() => {
        // If we didn't initiate the disconnect (status isn't IDLE or HIDDEN), it's likely an error/network drop
        if (this.status === 'CONNECTED') {
          this.setStatus('DISCONNECTED_ERROR');
        }
      });

      socket.onError(() => {
        this.setStatus('DISCONNECTED_ERROR');
      });
    }
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setStatus('DISCONNECTED_HIDDEN');
        this.disconnect();
      } else {
        // Coming back to visible
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

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

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
        console.log('[SubscriptionManager] User inactive, disconnecting...');
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
