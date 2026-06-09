import { redirect, notFound } from 'next/navigation'
import { checkTournamentAccess } from '@/lib/auth/tournament-access'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { MatchSlipsView } from '@/components/tournaments/print/match-slips-view'
import { PrintableBracketView } from '@/components/tournaments/print/printable-bracket-view'

interface PrintPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    mode?: 'brackets' | 'slips' | 'slip'
    division?: string
    match?: string
  }>
}

export default async function PrintPage({ params, searchParams }: PrintPageProps) {
  // Await params and searchParams for Next.js 15+
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  
  const hasAccess = await checkTournamentAccess(resolvedParams.id)
  if (!hasAccess) {
    redirect('/dashboard')
  }

  const [tournament, matches, participantsResult] = await Promise.all([
    getTournamentById(resolvedParams.id),
    getTournamentMatches(resolvedParams.id),
    getTournamentParticipants(resolvedParams.id, { limit: 1000 })
  ])

  if (!tournament) {
    notFound()
  }

  const participants = participantsResult.data
  const mode = resolvedSearchParams.mode || 'brackets'
  const singleMatchId = resolvedSearchParams.match ?? null

  // Single-slip mode: filter to the requested match
  const printMatches = singleMatchId
    ? matches.filter(m => m.id === singleMatchId)
    : matches

  // Auto-trigger print
  const printScript = (
    <script
        dangerouslySetInnerHTML={{
        __html: `
            window.onload = function() {
                setTimeout(() => {
                    window.print();
                    // window.close(); // Optional
                }, 1000);
            }
        `
        }}
    />
  )

  return (
    <div className="bg-white min-h-screen text-black p-4">
      {printScript}
      {(mode === 'slips' || mode === 'slip') ? (
        <MatchSlipsView
            matches={printMatches}
            participants={participants}
            tournament={tournament}
        />
      ) : (
        <PrintableBracketView 
            matches={matches} 
            participants={participants}
            tournament={tournament}
        />
      )}
    </div>
  )
}
