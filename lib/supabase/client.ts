'use client'

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Type for Clerk session object with getToken method
type ClerkSession = {
  getToken: (options?: { template?: string }) => Promise<string | null>
}

// Singleton instance for unauthenticated client (realtime, public access)
let clientInstance: SupabaseClient<Database> | null = null

/**
 * Creates a Supabase client authenticated with a Clerk session.
 * Use this for authenticated operations that need RLS context.
 */
export function createClerkSupabaseClient({ session }: { session: ClerkSession }): SupabaseClient<Database> {
  if (!session) {
    throw new Error("No session provided")
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return session.getToken() ?? null
      },
    },
  )
}

/**
 * Creates or returns a singleton Supabase client for realtime subscriptions.
 * Uses singleton pattern to prevent WebSocket connection exhaustion.
 */
export function createClient(): SupabaseClient<Database> {
  if (clientInstance) return clientInstance

  clientInstance = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return clientInstance
}
