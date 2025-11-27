import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from './types'

/**
 * Creates a Supabase client authenticated with the current Clerk session
 * For use in Server Components and Server Actions
 */
export async function createClerkSupabaseClient(): Promise<SupabaseClient<any>> {
  const supabase = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )

  return supabase;
}
