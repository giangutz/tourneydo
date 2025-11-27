import { getTournament } from '@/app/actions/tournaments'
import { deleteDivision, getTournamentRegistrations } from '@/app/actions/admin'
import { DivisionDialog } from '@/components/admin/division-dialog'
import { TournamentDialog } from '@/components/admin/tournament-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Users, Trophy, Plus, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

export default async function TournamentDetailsPage({ params }: { params: { id: string } }) {
  const { data: tournament, error } = await getTournament(params.id)
  const { data: registrations } = await getTournamentRegistrations(params.id)

  if (error || !tournament) return <div className="p-4 text-red-500">Error: {error || 'Tournament not found'}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{tournament.title}</h1>
            <Badge variant={
              tournament.status === 'registration_open' ? 'default' : 
              tournament.status === 'live' ? 'destructive' : 'secondary'
            }>
              {tournament.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {new Date(tournament.date).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {tournament.venue}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <TournamentDialog
            tournament={tournament}
            trigger={
              <Button variant="outline">Edit Details</Button>
            }
          />
          <Link href={`/dashboard/admin/brackets/${tournament.id}`}>
            <Button>
              <Trophy className="mr-2 h-4 w-4" />
              Manage Brackets
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{registrations?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">$</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${((registrations?.length || 0) * tournament.fees).toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="divisions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Divisions</CardTitle>
              <DivisionDialog 
                tournamentId={tournament.id}
                trigger={
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Division
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Belt</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament.divisions?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No divisions found.
                      </TableCell>
                    </TableRow>
                  )}
                  {tournament.divisions?.map((div: any) => (
                    <TableRow key={div.id}>
                      <TableCell className="font-medium">{div.name}</TableCell>
                      <TableCell>{div.age_min} - {div.age_max}</TableCell>
                      <TableCell>{div.weight_min} - {div.weight_max}kg</TableCell>
                      <TableCell className="capitalize">{div.belt_level}</TableCell>
                      <TableCell className="capitalize">{div.gender}</TableCell>
                      <TableCell className="text-right">
                        <form action={async () => {
                          'use server'
                          await deleteDivision(div.id, tournament.id)
                        }}>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registrations">
          <Card>
            <CardHeader>
              <CardTitle>Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Belt</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!registrations || registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map((reg: any) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.athlete?.name}</TableCell>
                        <TableCell>{reg.division?.name}</TableCell>
                        <TableCell>{reg.athlete?.age}</TableCell>
                        <TableCell>{reg.athlete?.weight}kg</TableCell>
                        <TableCell className="capitalize">{reg.athlete?.belt_level}</TableCell>
                        <TableCell>
                          <Badge variant={reg.cleared ? 'default' : 'secondary'}>
                            {reg.cleared ? 'Cleared' : 'Pending Payment'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
