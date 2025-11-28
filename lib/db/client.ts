/**
 * Properly typed Supabase client factory
 * 
 * Creates a Supabase client authenticated with the current Clerk session.
 * For use in Server Components and Server Actions.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from '@/lib/supabase/types'

/**
 * Creates a Supabase client authenticated with the current Clerk session
 * 
 * This client automatically injects the Clerk JWT token into requests,
 * allowing Supabase RLS policies to authenticate the user.
 * 
 * @returns SupabaseClient<Database> - Authenticated Supabase client
 * 
 * @example
 * ```ts
 * const supabase = createClerkSupabaseClient()
 * const { data, error } = await supabase.from('users').select('*')
 * ```
 */
export function createClerkSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken({ template: 'supabase' })
      },
    },
  )
}
