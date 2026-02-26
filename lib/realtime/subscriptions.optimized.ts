/**
 * Optimized Subscription Manager - Aggressive Background Cleanup
 * 
 * Reduces idle connections by disconnecting hidden tabs faster
 * 
 * Changes:
 * - Inactivity timeout: 30s → 10s (faster cleanup when idle)
 * - Hidden tab timeout: NEW 5s timeout (aggressive for background tabs)
 * - Smooth reconnect when tab becomes visible
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { disconnect } from 'process'

// OPTIMIZATION: Aggressive timeouts for MVP
const INACTIVITY_TIMEOUT = 10 * 1000 // 10 seconds - disconnect when idle
const PAGE_HIDDEN_TIMEOUT = 5 * 1000 // 5 seconds - aggressively disconnect hidden tabs

export type ConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED_IDLE'
  | 'DISCONNECTED_HIDDEN'
  | 'DISCONNECTED_ERROR'

export class SubscriptionManager {
  private static instance: SubscriptionManager
  private supabase = createClient()
  private inactivityTimer: NodeJS.Timeout | null = null
  private status: ConnectionStatus = 'CONNECTED'
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set()

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupVisibilityListener()
      this.setupActivityListeners()
      this.setupSocketListeners()
    }
  }

  public static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager()
    }
    return SubscriptionManager.instance
  }

  public subscribe(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener)
    listener(this.status) // Initial emit
    return () => this.statusListeners.delete(listener)
  }

  private notifyListeners() {
    this.statusListeners.forEach(listener => listener(this.status))
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus
      console.log(`[SubscriptionManager] Status: ${newStatus}`)
      this.notifyListeners()
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status
  }

  private setupSocketListeners() {
    // The `onOpen`, `onClose`, `onError` are not valid methods on supabase.realtime
    // According to the Supabase docs, the channel.subscribe() returns a status
    // For the global client, we can listen to the system channel
    const channel = this.supabase.channel('system')
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        this.setStatus('CONNECTED')
      } else if (status === 'CLOSED') {
        this.setStatus('DISCONNECTED_ERROR')
      } else if (status === 'CHANNEL_ERROR') {
        this.setStatus('DISCONNECTED_ERROR')
      }
    })
  }

  private setupVisibilityListener() {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[SubscriptionManager] Tab hidden - aggressive cleanup starting')
        this.setStatus('DISCONNECTED_HIDDEN')
        // OPTIMIZATION: Disconnect immediately when tab hidden
        this.disconnect()
      } else {
        console.log('[SubscriptionManager] Tab visible - reconnecting...')
        // OPTIMIZATION: Reconnect smoothly when tab becomes visible
        this.reconnect()
        this.setStatus('CONNECTED')
      }
      this.resetInactivityTimer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  private setupActivityListeners() {
    const resetTimer = () => this.resetInactivityTimer()

    // Reset timer on user activity
    document.addEventListener('mousemove', resetTimer, { passive: true })
    document.addEventListener('keydown', resetTimer, { passive: true })
    document.addEventListener('touchstart', resetTimer, { passive: true })
    document.addEventListener('click', resetTimer, { passive: true })

    this.resetInactivityTimer()
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }

    // OPTIMIZATION: Use different timeout based on visibility
    const timeout = document.hidden
      ? PAGE_HIDDEN_TIMEOUT // 5s for hidden tabs
      : INACTIVITY_TIMEOUT // 10s for visible but idle tabs

    // Only set timer if not hidden
    if (!document.hidden) {
      this.inactivityTimer = setTimeout(() => {
        console.log('[SubscriptionManager] Inactivity timeout - disconnecting')
        this.setStatus('DISCONNECTED_IDLE')
        this.disconnect()
      }, timeout)
    }

    // If we were disconnected but tab is now visible, reconnect
    if (
      (this.status === 'DISCONNECTED_IDLE' || this.status === 'DISCONNECTED_HIDDEN') &&
      !document.hidden
    ) {
      this.setStatus('CONNECTED')
      this.reconnect()
    }
  }

  public async disconnect() {
    console.log('[SubscriptionManager] Disconnecting from realtime...')
    try {
      await this.supabase.realtime.disconnect()
    } catch (error) {
      console.error('[SubscriptionManager] Error during disconnect:', error)
    }
  }

  public async reconnect() {
    console.log('[SubscriptionManager] Reconnecting to realtime...')
    try {
      await this.supabase.realtime.connect()
      this.resetInactivityTimer()
    } catch (error) {
      console.error('[SubscriptionManager] Error during reconnect:', error)
      this.setStatus('DISCONNECTED_ERROR')
    }
  }
}

// Initialize on client side only
export const initSubscriptionManager = () => {
  if (typeof window !== 'undefined') {
    return SubscriptionManager.getInstance()
  }
}
