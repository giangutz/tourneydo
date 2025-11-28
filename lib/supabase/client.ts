'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Type for Clerk session object with getToken method
type ClerkSession = {
  getToken: (options?: { template?: string }) => Promise<string | null>
}

export function createClerkSupabaseClient({ session }: { session: ClerkSession }): SupabaseClient<Database> {
  if (!session) {
    throw new Error("No session provided")
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return session.getToken() ?? null
      },
    },
  )
}
