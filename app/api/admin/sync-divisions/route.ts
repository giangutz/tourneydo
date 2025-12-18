import { NextRequest, NextResponse } from 'next/server'
import { ensureTournamentDivisionsAndCategories } from '@/lib/db/queries/divisions'
import { DEFAULT_DIVISIONS } from '@/lib/constants/divisions'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tournamentId = url.searchParams.get('tournamentId')

  if (!tournamentId) return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 })

  try {
    await ensureTournamentDivisionsAndCategories(tournamentId, DEFAULT_DIVISIONS)
    return NextResponse.json({ success: true, message: 'Divisions synced successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
