import { getTournamentsByOrganizerId } from '@/lib/db/queries/tournaments'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Trophy, Pencil } from 'lucide-react'
import Link from 'next/link'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatShortDate } from '@/lib/utils'
import { routes } from '@/config/routes'
import { redirect } from 'next/navigation'

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'

export default async function TournamentsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch tournaments using the query layer
  const tournaments = await getTournamentsByOrganizerId(userId) // Assuming getOrganizerTournaments is a typo and it should be getTournamentsByOrganizerId or a new import is needed. Sticking to existing import.

  return (
    <DashboardShell>
      <PageHeader
        title="My Tournaments"
        action={
          <Button asChild>
            <Link href={routes.organizer.tournamentNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Link>
          </Button>
        }
      />

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments yet"
          description="Create your first tournament to start accepting registrations."
          action={{
            label: 'Create Tournament',
            href: routes.organizer.tournamentNew,
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Card key={tournament.id}>
              <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
                <CardDescription>
                  {tournament.start_date ? formatShortDate(tournament.start_date) : 'Date TBD'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button className="flex-1" asChild>
                    <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                      Manage
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={routes.organizer.tournamentEdit(tournament.id)}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
