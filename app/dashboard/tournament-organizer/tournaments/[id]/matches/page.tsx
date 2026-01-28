import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getMatchesWithReadiness } from '@/lib/db/queries/match-readiness'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { OrganizerMatchesClient } from './organizer-matches-client'

interface LiveBracketPageProps {
  params: Promise<{
    id: string
  }>
}


import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

export const revalidate = 30 // Revalidate every 30 seconds

export default async function LiveBracketPage({ params }: LiveBracketPageProps) {
  const { id } = await params
  const [tournament, { data: participants }, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, { limit: 1000 }),
    getMatchesWithReadiness(id)
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Button variant="outline" asChild className="w-fit">
          <Link href={routes.organizer.tournamentDetail(id)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Matches"
        description="Live match console and results."
      />

      <OrganizerMatchesClient 
        tournament={tournament} 
        matches={matches} 
        participants={participants} 
      />
    </DashboardShell>
  )
}
