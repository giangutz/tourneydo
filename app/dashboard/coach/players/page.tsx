import { getPlayersWithTeams } from '@/lib/db/queries/players'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserPlus, Pencil } from 'lucide-react'
import Link from 'next/link'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { formatPlayerName, formatShortDate, calculateAge, getBeltLevelColor } from '@/lib/utils'
import { routes } from '@/config/routes'
import { Badge } from '@/components/ui/badge'

export default async function CoachPlayersPage() {
  const { userId } = await auth()
  if (!userId) return null

  // Fetch players using the query layer
  const players = await getPlayersWithTeams(userId)

  return (
    <DashboardShell>
      <PageHeader
        title="My Players"
        action={
          <Button asChild>
            <Link href={routes.coach.playerNew}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Player
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>Manage your athletes and assign them to teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Weight / Height</TableHead>
                <TableHead>Belt Level</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{formatPlayerName(player)}</span>
                      <span className="text-xs text-muted-foreground">{player.email || 'No email'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.dob ? (
                      <div className="flex flex-col">
                        <span>{calculateAge(player.dob)} yrs</span>
                        <span className="text-xs text-muted-foreground">{formatShortDate(player.dob)}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {player.weight ? (
                      <span>{player.weight} kg</span>
                    ) : player.height ? (
                      <span>{player.height} cm</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {player.belt_level ? (
                      <Badge variant="outline" className={getBeltLevelColor(player.belt_level)}>
                        {player.belt_level}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {player.teams && player.teams.length > 0 ? (
                        player.teams.map((team: any) => (
                          <Badge key={team.id} variant="secondary" className="text-xs">
                            {team.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={routes.coach.playerDetail(player.id)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {players.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No players found. Add your first player to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
