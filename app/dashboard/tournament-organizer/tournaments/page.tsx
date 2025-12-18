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
import { TournamentListTabs } from '@/components/tournaments/tournament-list-tabs'
import { formatShortDate } from '@/lib/utils'
import { routes } from '@/config/routes'
import { redirect } from 'next/navigation'

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'

export default async function TournamentsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch tournaments
  const tournaments = await getTournamentsByOrganizerId(userId)

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

      <TournamentListTabs tournaments={tournaments} userId={userId} />
    </DashboardShell>
  )
}
