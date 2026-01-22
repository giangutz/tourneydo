import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTeamsByUserId } from '@/lib/db/queries/teams'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentClient } from '@/app/dashboard/coach/tournaments/[id]/payment/payment-client'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'

export default async function PaymentPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params

  const [tournament, teams, registrations, divisions] = await Promise.all([
    getTournamentById(id),
    getTeamsByUserId(userId),
    getTournamentParticipants(id, { limit: 1000 }),
    getTournamentDivisions(id)
  ])

  if (!tournament) notFound()

  // Filter to only this coach's registrations
  const myRegistrations = registrations.data.filter(r => r.coach_id === userId)

  return (
    <DashboardShell>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/coach/tournaments">Tournaments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/coach/tournaments">{tournament.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={`Submit Payment - ${tournament.name}`}
        description="Select players to pay for and submit payment proof for verification."
      />

      <PaymentClient
        tournament={tournament}
        teams={teams}
        registrations={myRegistrations as any}
        coachId={userId}
        divisions={divisions}
      />
    </DashboardShell>
  )
}
