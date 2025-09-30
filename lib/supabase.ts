import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client with Clerk integration
export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Clerk-integrated Supabase client (for use with useSession)
export function createClerkSupabaseClient(session: any) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // Get the custom Supabase token from Clerk
      fetch: async (url, options = {}) => {
        // The Clerk `session` object has the getToken() method
        const clerkToken = await session?.getToken({
          // Pass the name of the JWT template you created in the Clerk Dashboard
          template: 'supabase',
        })

        // Insert the Clerk Supabase token into the headers
        const headers = new Headers(options?.headers)
        headers.set('Authorization', `Bearer ${clerkToken}`)

        // Call the default fetch
        return fetch(url, {
          ...options,
          headers,
        })
      },
    },
  })
}

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
