import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// PgBouncer readiness: this client uses Supabase's REST API which is already pooled
// at the infrastructure layer. When upgrading to Supabase Pro, enable Transaction Mode
// pooling in the dashboard (Settings → Database → Connection Pooling) — no code changes needed here.
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}

/**
 * Service-role client for trusted server-only contexts (cron jobs, webhooks)
 * that have no user session. Bypasses RLS — use with care.
 */
export function createServiceRoleSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}