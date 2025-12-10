'use client'

import { useState } from 'react'
import { Tournament, Match } from '@/types/models'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, DollarSign, Trophy } from 'lucide-react'
import { formatShortDate, formatCurrency } from '@/lib/utils'
import { BracketView } from '@/components/tournaments/bracket-view'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MatchDetailsDialog } from '@/components/tournaments/match-details-dialog'
import { LiveCourtsView } from '@/components/tournaments/live-courts-view'

interface PublicTournamentClientProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'

export function PublicTournamentClient({ tournament, matches, participants }: PublicTournamentClientProps) {
  useTournamentRealtime(tournament.id)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match)
    setDetailsOpen(true)
  }

  // Filter approved participants
  const approvedParticipants = participants.filter(p => p.status === 'verified' || p.status === 'paid')

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              {tournament.start_date ? formatShortDate(tournament.start_date) : 'Date TBD'}
              {tournament.end_date && ` - ${formatShortDate(tournament.end_date)}`}
            </p>
          </div>
          <Badge variant={
            tournament.status === 'upcoming' ? 'default' :
            tournament.status === 'ongoing' ? 'destructive' : // Use generic or another mapped variant if 'live' isn't valid
            'outline'
          } className="text-base px-4 py-1 self-start md:self-center capitalize">
            {tournament.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border">
          {tournament.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{tournament.venue}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{approvedParticipants.length} Participants</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>{tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free Entry'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{(tournament.tournament_type as string) === 'round_robin' ? 'Round Robin' : 'Single Elimination'}</span>
          </div>
        </div>
        
        {tournament.description && (
          <p className="text-muted-foreground max-w-3xl">{tournament.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="live">Live Matches</TabsTrigger>
          <TabsTrigger value="results">Recent Results</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={
                          tournament.status === 'upcoming' ? 'default' :
                          tournament.status === 'ongoing' ? 'destructive' :
                          'outline'
                        } className="capitalize">{tournament.status}</Badge>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Date</span>
                        <span>
                          {tournament.start_date ? formatShortDate(tournament.start_date) : 'TBD'}
                          {tournament.end_date && ` - ${formatShortDate(tournament.end_date)}`}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Venue</span>
                        <span>{tournament.venue || 'TBD'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Entry Fee</span>
                        <span>{tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Format</span>
                        <span>{(tournament.tournament_type as string) === 'round_robin' ? 'Round Robin' : 'Single Elimination'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {tournament.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold mb-2">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold">{approvedParticipants.length}</div>
                        <div className="text-xs text-muted-foreground">Participants</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold">{matches.length}</div>
                        <div className="text-xs text-muted-foreground">Total Matches</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold">{matches.filter(m => m.status === 'completed').length}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold">{matches.filter(m => m.status === 'in_progress').length}</div>
                        <div className="text-xs text-muted-foreground">Live Now</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Matches Tab */}
        <TabsContent value="live" className="space-y-4">
          <LiveCourtsView
            tournament={tournament}
            matches={matches}
            participants={participants}
          />
          {(!tournament.courts || tournament.courts === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No courts configured for this tournament.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recent Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>Recently concluded matches. Click details to view full scores.</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.filter(m => m.status === 'completed').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No completed matches yet.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {matches
                    .filter(m => m.status === 'completed')
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) // Most recent first
                    .map(match => {
                       const p1 = participants.find(p => p.player_id === match.player1_id)
                       const p2 = participants.find(p => p.player_id === match.player2_id)
                       const name1 = p1 ? `${p1.player.first_name} ${p1.player.last_name}` : 'TBD'
                       const name2 = p2 ? `${p2.player.first_name} ${p2.player.last_name}` : 'TBD'
                       const winnerId = match.winner_id
                       
                       return (
                         <Card 
                           key={match.id} 
                           className="cursor-pointer hover:shadow-md transition-shadow"
                           onClick={() => handleMatchClick(match)}
                         >
                           <CardContent className="p-4">
                             <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground">
                               <span>Match #{match.match_number}</span>
                               <span className="capitalize">{formatShortDate(match.updated_at)}</span>
                             </div>
                             <div className="space-y-2">
                               <div className={`flex justify-between items-center p-2 rounded ${winnerId === match.player1_id ? 'bg-green-50 dark:bg-green-900/20 font-medium' : ''}`}>
                                  <span>{name1}</span>
                                  {winnerId === match.player1_id && <Trophy className="h-4 w-4 text-green-600" />}
                               </div>
                               <div className={`flex justify-between items-center p-2 rounded ${winnerId === match.player2_id ? 'bg-green-50 dark:bg-green-900/20 font-medium' : ''}`}>
                                  <span>{name2}</span>
                                  {winnerId === match.player2_id && <Trophy className="h-4 w-4 text-green-600" />}
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       )
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bracket Tab */}
        <TabsContent value="bracket" className="space-y-4">
          <Card>
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle>Tournament Bracket</CardTitle>
              <CardDescription>
                View matches and results. Click on a match to see details.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {matches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Running brackets has not started yet.
                </div>
              ) : (
                <BracketView
                  matches={matches}
                  participants={participants}
                  onMatchClick={handleMatchClick}
                  tournamentType={tournament.tournament_type as 'standard' | 'open-belt'}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                Registered players and teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedParticipants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No participants registered yet.
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {approvedParticipants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <Avatar>
                          <AvatarFallback>{p.players.first_name[0]}{p.players.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-medium truncate">
                            {p.players.first_name} {p.players.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {p.teams?.name || 'Unattached'}
                            {p.players.belt_level && ` • ${p.players.belt_level} Belt`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MatchDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        match={selectedMatch}
        participants={participants}
      />
    </div>
  )
}
