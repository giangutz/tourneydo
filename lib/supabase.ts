import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import { useMemo } from 'react'

// Lazy-loaded Supabase clients to avoid prerendering issues
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables are not configured:', {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      });
      // During build/prerendering or when env vars are missing, return empty strings
      // Client components should check for mounting and handle missing config gracefully
      supabaseUrl = '';
      supabaseAnonKey = '';
    }
  }

  return { supabaseUrl, supabaseAnonKey };
}

// Client-side Supabase client with Clerk integration
export function createClientComponentClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase configuration missing, returning dummy client');
    return createBrowserClient('https://dummy.supabase.co', 'dummy-key');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Public Supabase client for unauthenticated access
export function createPublicSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Clerk-integrated Supabase client (for use with useSession)
export function createClerkSupabaseClient(session: any) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  // During SSR/prerendering, config might be empty - return a dummy client
  if (!supabaseUrl || !supabaseAnonKey) {
    return createBrowserClient('https://zboszzozvssdzvvwswso.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpib3N6em96dnNzZHp2dndzd3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxODMzMDMsImV4cCI6MjA3NDc1OTMwM30.RcCuHpMDHjylcbhkXAln4OP6G34tOpsWlH71fiWAWBA');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    // Use Clerk session token directly (new integration method)
    accessToken: async () => {
      return await session?.getToken() ?? null;
    },
  });
}

// Custom hook for using Supabase with Clerk authentication
export function useSupabase() {
  const { session, isLoaded } = useSession();

  const supabaseClient = useMemo(() => {
    if (!isLoaded || !session) {
      return null;
    }
    return createClerkSupabaseClient(session);
  }, [session, isLoaded]);

  return {
    supabase: supabaseClient,
    isLoaded,
    session,
  };
}

// Legacy client for backward compatibility - lazy loaded to avoid build issues
let legacyClient: any = null;

export const supabase = (() => {
  if (!legacyClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Return a dummy client when env vars are missing
      legacyClient = createClient('https://dummy.supabase.co', 'dummy-key');
    } else {
      legacyClient = createClient(url, key);
    }
  }
  return legacyClient;
})();
