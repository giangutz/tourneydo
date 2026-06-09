import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Readiness probe.
 *
 * Verifies the app can reach its critical dependency (the database) before it is
 * considered ready to receive traffic. Returns 503 when the DB is unreachable so
 * orchestrators and uptime monitors can react. Must stay public (see proxy.ts).
 *
 * Uses a `head: true` count query so it confirms connectivity without returning
 * any row data.
 */
export async function GET() {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const { error } = await supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'unavailable', dependency: 'database' },
        { status: 503 },
      )
    }

    return NextResponse.json({ status: 'ready', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'unavailable', dependency: 'database' },
      { status: 503 },
    )
  }
}
