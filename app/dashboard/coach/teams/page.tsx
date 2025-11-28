import { getTeamsWithPlayerCount } from '@/lib/db/queries/teams'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatShortDate } from '@/lib/utils'
import { routes } from '@/config/routes'

export default async function CoachTeamsPage() {
  const { userId } = await auth()
  if (!userId) return null

  // Fetch teams with player count using the query layer
  const teams = await getTeamsWithPlayerCount(userId)

  return (
    <DashboardShell>
      <PageHeader
        title="My Teams"
        action={
          <Button asChild>
            <Link href={routes.coach.teamNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Link>
          </Button>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create your first team to start managing players and registrations."
          action={{
            label: 'Create Team',
            href: routes.coach.teamNew,
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>
                  Created on {formatShortDate(team.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{team.player_count} Players</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/coach/teams/${team.id}`}>
                      View Roster
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
