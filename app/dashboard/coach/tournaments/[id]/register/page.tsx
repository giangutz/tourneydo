import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTeamsByUserId } from '@/lib/db/queries/teams'
import { getPlayersWithTeams } from '@/lib/db/queries/players'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { auth } from '@clerk/nextjs/server'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { RegistrationClient } from './registration-client'
import { notFound } from 'next/navigation'
import {
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb'

export default async function RegisterPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return null

  const { id } = await params

  const [tournament, teams, players, divisions, existingRegistrations] = await Promise.all([
    getTournamentById(id),
    getTeamsByUserId(userId),
    getPlayersWithTeams(userId),
    getTournamentDivisions(id),
    getTournamentParticipants(id, { limit: 1000 }) // Fetch enough to cover most teams
  ])

  if (!tournament) {
    notFound()
  }

  // Filter registrations to only this coach's (security/privacy)
  const myRegistrations = existingRegistrations.data.filter(r => r.coach_id === userId)
  
  // Create a map of existing registrations for easy lookup
  const registrationMap = new Map(
      myRegistrations.map(r => [r.player_id, r])
  )

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
            <BreadcrumbPage>Register</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <PageHeader
        title={`Register for ${tournament.name}`}
        description="Select players, verify their details, and confirm registration."
      />
      
      <div className="flex-1">
        <RegistrationClient 
          tournament={tournament}
          teams={teams}
          players={players}
          divisions={divisions}
          existingRegistrations={registrationMap}
          coachId={userId}
        />
      </div>
    </DashboardShell>
  )
}
