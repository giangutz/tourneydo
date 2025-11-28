export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { BracketView } from '@/components/tournaments/bracket-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, Trophy, PhilippinePeso } from 'lucide-react'
import { formatShortDate } from '@/lib/utils'
import { ParticipantList } from '@/components/tournaments/participant-list'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { SiteHeader } from "@/components/layouts/site-header"
import { SiteFooter } from "@/components/layouts/site-footer"

interface PublicTournamentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  const participants = await getTournamentParticipants(id)
  const matches = await getTournamentMatches(id)
  
  // Group participants by team
  const teamMap = new Map<string, typeof participants>()
  participants.forEach(participant => {
    const teamId = participant.team?.id
    if (teamId) {
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, [])
      }
      teamMap.get(teamId)?.push(participant)
    }
  })
  const uniqueTeams = Array.from(teamMap.values())

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-muted/50 border-b">
        <div className="container mx-auto py-12 px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={tournament.status === 'ongoing' ? 'default' : 'secondary'}>
                  {tournament.status}
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-2">{tournament.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {tournament.start_date && (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    {formatShortDate(tournament.start_date)}
                    {tournament.end_date && tournament.end_date !== tournament.start_date && ` - ${formatShortDate(tournament.end_date)}`}
                  </div>
                )}
                {tournament.venue && (
                  <div className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    {tournament.venue}
                  </div>
                )}
                {tournament.entry_fee && (
                  <div className="flex items-center">
                    <PhilippinePeso className="mr-1 h-4 w-4" />
                    {tournament.entry_fee.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {tournament.status === 'upcoming' && (
                <Button size="lg" asChild>
                  <Link href={routes.register}>Register Now</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>About this Tournament</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {tournament.description || 'No description provided.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="font-medium">Registration Deadline</div>
                      <div className="text-sm text-muted-foreground">
                        {tournament.registration_deadline 
                          ? formatShortDate(tournament.registration_deadline) 
                          : 'Not specified'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Entry Fee</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        {tournament.entry_fee ? (
                          <>
                            <PhilippinePeso className="h-3 w-3" />
                            {tournament.entry_fee.toFixed(2)}
                          </>
                        ) : 'Free'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Participants</div>
                      <div className="text-sm text-muted-foreground">
                        {uniqueTeams.length}{tournament.max_players ? `/${tournament.max_players}` : ''} teams registered
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Registered Teams</CardTitle>
                <CardDescription>
                  {uniqueTeams.length} {uniqueTeams.length === 1 ? 'team' : 'teams'} participating in this tournament.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {uniqueTeams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No teams registered yet.
                    </div>
                 ) : (
                   <div className="space-y-6">
                     {Array.from(teamMap.entries()).map(([teamId, teamParticipants]) => {
                       const team = teamParticipants[0]?.team
                       if (!team) return null
                       
                       return (
                         <Card key={teamId} className="border-2">
                           <CardHeader className="pb-3">
                             <CardTitle className="text-lg">{team.name}</CardTitle>
                             <CardDescription>
                               {teamParticipants.length} {teamParticipants.length === 1 ? 'player' : 'players'}
                             </CardDescription>
                           </CardHeader>
                           <CardContent>
                             <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                               {teamParticipants.map((p) => (
                                 <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                                   <div className="flex-1 min-w-0">
                                     <div className="font-medium truncate">
                                       {p.player?.first_name} {p.player?.last_name}
                                     </div>
                                     <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                       {p.player?.belt_level && (
                                         <div className="flex items-center gap-1">
                                           <Badge variant="outline" className="text-xs">
                                             {p.player.belt_level}
                                           </Badge>
                                         </div>
                                       )}
                                       {p.player?.weight && (
                                         <div className="text-xs">
                                           {p.player.weight} kg
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </CardContent>
                         </Card>
                       )
                     })}
                   </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bracket">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Bracket</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {matches.length > 0 ? (
                  <BracketView matches={matches} participants={participants} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Bracket has not been generated yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Match Results</CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.map((match) => {
                      const p1 = participants.find(p => p.id === match.player1_id)
                      const p2 = participants.find(p => p.id === match.player2_id)
                      return (
                        <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1 text-right">
                            <div className="font-medium">{p1?.team?.name || 'TBD'}</div>
                            <div className="text-sm text-muted-foreground">{p1?.player?.first_name} {p1?.player?.last_name}</div>
                          </div>
                          <div className="px-4 flex flex-col items-center">
                            <div className="text-xl font-bold">
                              {match.score_player1} - {match.score_player2}
                            </div>
                            <Badge variant={match.status === 'completed' ? 'secondary' : 'outline'}>
                              {match.status}
                            </Badge>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{p2?.team?.name || 'TBD'}</div>
                            <div className="text-sm text-muted-foreground">{p2?.player?.first_name} {p2?.player?.last_name}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No matches scheduled yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </main>
      <SiteFooter />
    </div>
  )
}
