import { getTournaments } from '@/lib/db/queries/tournaments'
import { getCoachRegistrations } from '@/lib/db/queries/registrations'
import { auth } from '@clerk/nextjs/server'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { TournamentList } from './tournament-list'

export default async function CoachTournamentsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const [tournaments, registrations] = await Promise.all([
    getTournaments(),
    getCoachRegistrations(userId)
  ])

  return (
    <DashboardShell>
      <PageHeader
        title="Tournaments"
        description="Browse and register for upcoming tournaments."
      />
      <TournamentList tournaments={tournaments} registrations={registrations} coachId={userId} />
    </DashboardShell>
  )
}
