import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getMatchesWithReadiness } from '@/lib/db/queries/match-readiness'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { BracketPageClient } from '@/components/tournaments/bracket-page-client'

interface BracketPageProps {
  params: Promise<{
    id: string
  }>
}


import { checkTournamentAccess } from '@/lib/auth/tournament-access'

export default async function BracketPage({ params }: BracketPageProps) {
  const { id } = await params
  
  // Check access and get role
  const access = await checkTournamentAccess(id)
  
  const [tournament, { data: participants }, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, { limit: 10000 }),
    getMatchesWithReadiness(id)
  ])

  if (!tournament) {
    notFound()
  }

  // Determine effective role
  const role = access.isOrganizer ? 'admin' : (access.userRole || null)


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
        title="Bracket"
        description="Manage tournament bracket and results."
      />
      <BracketPageClient 
        tournament={tournament} 
        participants={participants} 
        matches={matches} 
        userRole={role}
      />
    </DashboardShell>
  )
}
