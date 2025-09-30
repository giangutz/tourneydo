import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Lazy-loaded Supabase clients to avoid prerendering issues
let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

function getSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // During build/prerendering, environment variables might not be available
      // Return empty strings to prevent crashes, but client components should check for mounting
      if (typeof window === 'undefined') {
        supabaseUrl = '';
        supabaseAnonKey = '';
      } else {
        throw new Error('Supabase environment variables are not configured');
      }
    }
  }

  return { supabaseUrl, supabaseAnonKey };
}

// Client-side Supabase client with Clerk integration
export function createClientComponentClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
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
    return createClient('https://dummy.supabase.co', 'dummy-key');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // Get the custom Supabase token from Clerk
      fetch: async (url, options = {}) => {
        // The Clerk `session` object has the getToken() method
        const clerkToken = await session?.getToken({
          // Pass the name of the JWT template you created in the Clerk Dashboard
          template: 'supabase',
        });

        // Insert the Clerk Supabase token into the headers
        const headers = new Headers(options?.headers);
        headers.set('Authorization', `Bearer ${clerkToken}`);

        // Call the default fetch
        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });
}

// Legacy client for backward compatibility
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
