import { getTeamWithPlayers } from '@/lib/db/queries/teams'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPlayerName, formatShortDate, calculateAge, getBeltLevelColor } from '@/lib/utils'
import { routes } from '@/config/routes'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Pencil } from 'lucide-react'
import { SearchInput } from '@/components/search-input'
import { CustomPagination } from '@/components/custom-pagination'

interface TeamPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    query?: string
    page?: string
  }>
}

export default async function TeamPage(props: TeamPageProps) {
  const { userId } = await auth()
  if (!userId) return null

  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const query = searchParams?.query?.toLowerCase() || ''
  const currentPage = Number(searchParams?.page) || 1
  const pageSize = 10

  const team = await getTeamWithPlayers(id)

  if (!team) {
    notFound()
  }

  // Verify ownership
  if (team.user_id !== userId) {
    redirect('/dashboard/coach/teams')
  }

  // In-memory Filter & Pagination
  let filteredPlayers = team.players
  if (query) {
    filteredPlayers = team.players.filter((p: any) => 
      p.first_name?.toLowerCase().includes(query) || 
      p.last_name?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query)
    )
  }
  
  const totalPages = Math.ceil(filteredPlayers.length / pageSize)
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <DashboardShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={routes.coach.teams}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
        <PageHeader
          title={team.name}
          description={`Created on ${formatShortDate(team.created_at)}`}
          action={
            <Button asChild>
              <Link href={routes.coach.playerNew}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Player
              </Link>
            </Button>
          }
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Roster</CardTitle>
            <CardDescription>
              {team.players.length} {team.players.length === 1 ? 'player' : 'players'} assigned to this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
               <SearchInput placeholder="Search roster..." />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Weight / Height</TableHead>
                  <TableHead>Belt Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlayers.map((player: any) => (
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
                {paginatedPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {query ? 'No players match your search.' : 'No players assigned to this team yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            <div className="mt-4">
              <CustomPagination totalPages={totalPages} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
