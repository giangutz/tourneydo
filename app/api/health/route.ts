import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness probe.
 *
 * Cheap, dependency-free check that the app process is up and serving.
 * Used by uptime monitors and load balancers. Must stay public (see proxy.ts).
 */
export function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
