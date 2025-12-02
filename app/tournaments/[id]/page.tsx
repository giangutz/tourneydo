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
import { Calendar, MapPin, Users, Trophy, PhilippinePeso, Printer } from 'lucide-react'
import { formatShortDate } from '@/lib/utils'
import { ParticipantList } from '@/components/tournaments/participant-list'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { SiteHeader } from "@/components/layouts/site-header"
// import { SiteFooter } from "@/components/layouts/site-footer"
import { PublicTournamentClient } from './public-tournament-client'
import { LiveCourtsView } from '@/components/tournaments/live-courts-view'

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
        <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
          <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Badge 
                    variant={tournament.status === 'ongoing' ? 'default' : 'secondary'}
                    className="text-sm px-3 py-1"
                  >
                    {tournament.status}
                  </Badge>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {tournament.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {tournament.start_date && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatShortDate(tournament.start_date)}
                        {tournament.end_date && tournament.end_date !== tournament.start_date && ` - ${formatShortDate(tournament.end_date)}`}
                      </span>
                    </div>
                  )}
                  {tournament.venue && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                      <MapPin className="h-4 w-4" />
                      <span>{tournament.venue}</span>
                    </div>
                  )}
                  {tournament.entry_fee && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                      <PhilippinePeso className="h-4 w-4" />
                      <span>{tournament.entry_fee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
                    <Users className="h-4 w-4" />
                    <span>{participants.length} participants</span>
                  </div>
                </div>
              </div>
              {tournament.status === 'upcoming' && (
                <Button size="lg" className="shadow-lg" asChild>
                  <Link href={routes.register}>Register Now</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="overview" className="w-full space-y-6">
            <div className="bg-muted/30 rounded-lg p-1 w-full">
              <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="participants"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Participants
                </TabsTrigger>
                <TabsTrigger 
                  value="bracket"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Bracket
                </TabsTrigger>
                {/* TODO: Re-enable Matches tab in future update */}
                {/* <TabsTrigger value="matches">Matches</TabsTrigger> */}
                <TabsTrigger 
                  value="live"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Live Courts
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="live">
             <LiveCourtsView tournament={tournament} matches={matches} participants={participants} />
          </TabsContent>

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
                        {participants.length}{tournament.max_players ? `/${tournament.max_players}` : ''} participants registered
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
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                              <div>
                                <CardTitle className="text-lg">{team.name}</CardTitle>
                                <CardDescription>
                                  {teamParticipants.length} {teamParticipants.length === 1 ? 'player' : 'players'}
                                </CardDescription>
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/tournaments/${tournament.id}/print-ids?teamId=${team.id}`} target="_blank">
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print IDs
                                </Link>
                              </Button>
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
                                       {p.player?.height && (
                                         <div className="text-xs">
                                           {p.player.height} cm
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
                  <PublicTournamentClient matches={matches} participants={participants} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Bracket has not been generated yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TODO: Re-enable Matches tab in future update */}
          {/* <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Match Results</CardTitle>
                <CardDescription>
                  Recently completed matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matches.length > 0 ? (
                  <div className="space-y-6">
                    {/* Group matches by division and sort by completion time *}
                    {(Object.entries(
                      matches
                        .filter(m => m.status === 'completed') // Only show completed matches
                        .reduce((acc, match) => {
                          const key = `${match.division || 'No Division'}-${match.category || 'No Category'}`
                          if (!acc[key]) acc[key] = []
                          acc[key].push(match)
                          return acc
                        }, {} as Record<string, (typeof matches)[number][]>)
                    ) as [string, (typeof matches)[number][]][])
                    .map(([divisionKey, divisionMatches]) => {
                      const firstMatch = divisionMatches[0]
                      const divisionLabel = firstMatch.division || 'No Division'
                      const categoryLabel = firstMatch.category || 'No Category'
                      
                      // Sort by updated_at (most recent first)
                      const sortedMatches = [...divisionMatches].sort((a, b) => {
                        const timeA = new Date(a.updated_at || a.created_at).getTime()
                        const timeB = new Date(b.updated_at || b.created_at).getTime()
                        return timeB - timeA // Most recent first
                      })
                      
                      return (
                        <div key={divisionKey} className="space-y-3">
                          <h3 className="font-semibold text-lg border-b pb-2">
                            {divisionLabel} - {categoryLabel}
                          </h3>
                          <div className="space-y-3">
                            {sortedMatches.map((match) => {
                              const p1 = participants.find(p => p.player_id === match.player1_id)
                              const p2 = participants.find(p => p.player_id === match.player2_id)
                              const winner = match.winner_id === match.player1_id ? p1 : match.winner_id === match.player2_id ? p2 : null
                              
                              return (
                                <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                  <div className="flex-1 text-right">
                                    <div className={`font-bold ${match.winner_id === match.player1_id ? 'text-primary' : ''}`}>
                                      {p1?.player?.first_name} {p1?.player?.last_name}
                                    </div>
                                    {p1?.team?.name && (
                                      <div className="text-sm text-muted-foreground">{p1.team.name}</div>
                                    )}
                                  </div>
                                  <div className="px-6 flex flex-col items-center">
                                    <div className="text-2xl font-bold">
                                      {match.score_player1} - {match.score_player2}
                                    </div>
                                    <Badge variant="secondary" className="mt-1">
                                      Round {match.round}
                                    </Badge>
                                    {winner && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Winner: {winner.player?.first_name} {winner.player?.last_name}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <div className={`font-bold ${match.winner_id === match.player2_id ? 'text-primary' : ''}`}>
                                      {p2?.player?.first_name} {p2?.player?.last_name}
                                    </div>
                                    {p2?.team?.name && (
                                      <div className="text-sm text-muted-foreground">{p2.team.name}</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No completed matches yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>
      </div>
      </main>
      {/* <SiteFooter /> */}
    </div>
  )
}
