import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { useSession } from "@clerk/nextjs"

/**
 * Creates a Supabase client for client-side use with Clerk session
 * Pass the session token from useSession() hook
 */

export function createClerkSupabaseClientBrowser(session: any) {
  return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        async accessToken() {
          return session?.getToken() ?? null
        },
      },
    )
}
