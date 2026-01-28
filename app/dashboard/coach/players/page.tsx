import { getPlayersWithTeamsPaginated } from '@/lib/db/queries/players'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { SearchInput } from '@/components/search-input'
import { CustomPagination } from '@/components/custom-pagination'

export default async function CoachPlayersPage(props: {
  searchParams?: Promise<{
    query?: string
    page?: string
  }>
}) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const currentPage = Number(searchParams?.page) || 1
  
  const { userId } = await auth()
  if (!userId) return null

  // Fetch players with pagination
  const { data: players, totalPages } = await getPlayersWithTeamsPaginated(userId, currentPage, 10, query)

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
          <div className="mb-4">
             <SearchInput placeholder="Search players..." className="md:w-full" />
          </div>
          
          <div className="hidden lg:block">
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
                      No players found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:hidden">
             {players.map((player) => (
                <Card key={player.id} className="overflow-hidden">
                   <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                         <div>
                            <CardTitle className="text-lg">{formatPlayerName(player)}</CardTitle>
                            <CardDescription>{player.email || 'No email'}</CardDescription>
                         </div>
                         {player.belt_level && (
                            <Badge variant="outline" className={getBeltLevelColor(player.belt_level)}>
                               {player.belt_level}
                            </Badge>
                         )}
                      </div>
                   </CardHeader>
                   <CardContent className="pb-3 text-sm">
                      <div className="grid grid-cols-2 gap-y-2">
                         <div>
                            <span className="text-muted-foreground">Age:</span>
                            <span className="ml-2 font-medium">{player.dob ? `${calculateAge(player.dob)} yrs` : '-'}</span>
                         </div>
                         <div>
                            <span className="text-muted-foreground">Weight:</span>
                            <span className="ml-2 font-medium">{player.weight ? `${player.weight} kg` : '-'}</span>
                         </div>
                         <div className="col-span-2">
                            <span className="text-muted-foreground block mb-1">Teams:</span>
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
                         </div>
                      </div>
                   </CardContent>
                   <CardFooter className="pt-0">
                      <Button variant="outline" className="w-full" asChild>
                        <Link href={routes.coach.playerDetail(player.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      </Button>
                   </CardFooter>
                </Card>
             ))}
             {players.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  No players found.
                </div>
             )}
          </div>
          
          <div className="mt-4">
             <CustomPagination totalPages={totalPages} />
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
