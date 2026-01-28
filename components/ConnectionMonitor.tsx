'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw } from 'lucide-react';

export function ConnectionMonitor() {
  const [isOnline, setIsOnline] = useState(true);
  const [status, setStatus] = useState<'CONNECTED' | 'DISCONNECTED_IDLE' | 'DISCONNECTED_HIDDEN' | 'DISCONNECTED_ERROR'>('CONNECTED');
  
  useEffect(() => {
    // 1. Handle Browser Connectivity (Immediate Feedback)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Subscribe to Smart Status from SubscriptionManager
    // We import dynamically to avoid SSR issues if any, but since we are in useEffect it's fine.
    // However, SubscriptionManager is a singleton created on client side.
    const { initSubscriptionManager } = require('@/lib/realtime/subscriptions');
    const manager = initSubscriptionManager();
    
    let unsubscribe = () => {};
    
    if (manager) {
       unsubscribe = manager.subscribe((newStatus: any) => {
         setStatus(newStatus);
       });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Priority 1: No Internet (Absolute Error)
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 bg-red-600 text-white shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
        <WifiOff className="h-4 w-4" />
        <span>No Internet Connection</span>
      </div>
    );
  }

  // Priority 2: Intentional Idle Disconnect (Show Pause Badge)
  if (status === 'DISCONNECTED_IDLE') {
    return (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-md flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Live Updates Paused (Idle)</span>
        </div>
    );
  }
  
  // Priority 3: Actual Connection Error (but user is active)
  if (status === 'DISCONNECTED_ERROR') {
     return (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm font-medium z-50 bg-red-100 text-red-800 border border-red-200 shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
           <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
           <span>Reconnecting Live Updates...</span>
        </div>
     );
  }

  // HIDDEN: Do not show anything (user can't see it anyway)
  // CONNECTED: Do not show anything (clean UI)
  
  return null;
}
