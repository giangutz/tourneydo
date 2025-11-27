import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      auth: {
        persistSession: false,
      },
      accessToken: async () => {
        const token = await getToken()
        return token ?? null
      },
    }
  )
}

// For use in client components with Clerk
export function getSupabaseClient(getToken: () => Promise<string | null>) {
  return createClerkSupabaseClient(getToken)
}

