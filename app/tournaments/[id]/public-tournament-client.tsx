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
import { PublicParticipantList } from '@/components/tournaments/public-participant-list'
import { VanityMetrics, LivePulse } from '@/components/tournaments/overview/vanity-metrics'
import { Activity, Layers } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { DivisionBreakdown } from '@/components/tournaments/shared/division-breakdown'
import { BeltDistributionChart, GenderSplitChart, TeamDelegationsChart } from '@/components/tournaments/overview/charts'
import { TournamentCountdown } from '@/components/tournaments/shared/tournament-countdown'

interface PublicTournamentClientProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

import { calculateTournamentPhase } from '@/lib/utils/tournament-phases'
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

  // Filter matches to only include relevant lifecycle states
  const relevantMatches = matches.filter((m: any) => {
    const state = m.lifecycle_state
    return state === 'WAITING' || state === 'CONTEST' || state === 'IN_PROGRESS' || state === 'COMPLETED'
  })

  // Calculate Match Stats for KPIs
  const uniquePlayers = new Set<string>()
  const uniqueDivisions = new Set<string>()
  relevantMatches.forEach((m: any) => {
      if (m.player1_id) uniquePlayers.add(m.player1_id)
      if (m.player2_id) uniquePlayers.add(m.player2_id)
      if (m.tournament_divisions?.name) uniqueDivisions.add(m.tournament_divisions.name)
  })
  
  const totalMatches = relevantMatches.length
  const completedMatches = relevantMatches.filter(m => m.lifecycle_state === 'COMPLETED').length
  const matchesInProgress = relevantMatches.filter(m => m.lifecycle_state === 'IN_PROGRESS').length
  const progressVal = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  // Calculate Extra Stats
  const uniqueTeams = new Set(participants.map(p => p.team_id)).size
  const uniqueDivisionsFromParticipants = new Set(participants.map(p => p.division_id)).size

  const phase = calculateTournamentPhase(tournament)
  const isUpcoming = phase === 'upcoming' || phase === 'weigh-in' // Hide brackets during weigh-in too usually? or show brackets but locked? Let's say weigh-in implies preparation.
  // Actually, weigh-in might mean we can show the participants list more prominently.
  // For the tabs logic:
  // Upcoming -> Overview, Participants
  // Weigh-in -> Overview, Participants, (Maybe stats?)
  // Ongoing -> Live, Brackets, Stats, etc.
  
  const showLiveTabs = phase === 'ongoing' || phase === 'concluded' || phase === 'weigh-in' // Allow checking stats/brackets during weigh-in if generated?
  // Let's stick to the previous logic but using the phase:
  const isLiveOrDone = phase === 'ongoing' || phase === 'concluded'

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
            phase === 'upcoming' ? 'default' :
            phase === 'weigh-in' ? 'secondary' :
            phase === 'ongoing' ? 'destructive' :
            'outline'
          } className="text-base px-4 py-1 self-start md:self-center capitalize">
            {phase.replace('-', ' ')}
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
        </div>
        
        {tournament.description && (
          <p className="text-muted-foreground max-w-3xl">{tournament.description}</p>
        )}
      </div>

      {/* Countdown Row */}
      {(phase === 'upcoming' || phase === 'weigh-in') && (
        <TournamentCountdown startDate={tournament.start_date} />
      )}

      {/* Phase-Specific KPI Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* UPCOMING PHASE */}
        {(phase === 'upcoming' || phase === 'weigh-in') && (
            <>
                {/* 1. Registrations */}
                <StatCard
                    title="Registrations"
                    value={approvedParticipants.length}
                    icon={Users}
                    description="Confirmed Athletes"
                />

                {/* 2. Teams */}
                <StatCard
                    title="Teams"
                    value={uniqueTeams}
                    icon={Layers} // Using Layers as proxy for Teams icon if Shield not available
                    description="Schools & Academies"
                />

                {/* 3. Divisions (Replacing Capacity) */}
                <StatCard
                    title="Divisions"
                    value={uniqueDivisionsFromParticipants} // Already a number
                    icon={Layers}
                    description="Active Categories"
                />
                
                 {/* 4. Entry Fee (New) */}
                 <StatCard
                    title="Entry Fee"
                    value={tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}
                    icon={DollarSign}
                    description="Per Athlete"
                />
            </>
        )}

        {/* ONGOING PHASE */}
        {phase === 'ongoing' && (
            <>
                <StatCard
                    title="Matches In Progress"
                    value={matchesInProgress}
                    icon={Activity}
                    description="Happening Now"
                />
                <StatCard
                    title="Matches Completed"
                    value={completedMatches}
                    icon={Trophy}
                    description={`${progressVal}% Complete`}
                />
                <StatCard
                    title="Matches Remaining"
                    value={totalMatches - completedMatches}
                    icon={Layers}
                    description="Upcoming"
                />
                 <StatCard
                    title="Active Divisions"
                    value={uniqueDivisions.size}
                    icon={Users}
                    description="Contested Categories"
                />
            </>
        )}

        {/* COMPLETED PHASE */}
        {phase === 'concluded' && (
             <>
                <StatCard
                    title="Total Matches"
                    value={completedMatches}
                    icon={Trophy}
                    description="Successfully Concluded"
                />
                <StatCard
                    title="Total Participants"
                    value={approvedParticipants.length}
                    icon={Users}
                    description="Competed"
                />
                <StatCard
                    title="Divisions"
                    value={uniqueDivisionsFromParticipants}
                    icon={Layers}
                    description="Awarded"
                />
                 <StatCard
                    title="Completion"
                    value="100%"
                    icon={Activity}
                    description="Tournament Finished"
                />
            </>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className={`grid w-full h-auto grid-cols-2 ${isLiveOrDone ? 'md:grid-cols-6' : 'md:grid-cols-3'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isLiveOrDone && (
            <>
              <TabsTrigger value="live">Live Matches</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="results">Recent Results</TabsTrigger>
            </>
          )}
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <VanityMetrics participants={approvedParticipants} />
          
          {tournament.status === 'ongoing' && (
            <LivePulse matches={matches} />
          )}

          <div className="grid gap-6 md:grid-cols-7">
            {/* Left Column: Details & Description (4/7) */}
            <div className="md:col-span-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                     <h3 className="font-semibold mb-2 text-sm">Description</h3>
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       {tournament.description || 'No description provided.'}
                     </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase">Entry Fee</div>
                      <div className="text-sm font-medium mt-1">
                        {tournament.entry_fee ? formatCurrency(tournament.entry_fee) : 'Free'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase">Max Capacity</div>
                      <div className="text-sm font-medium mt-1">
                         {tournament.max_players ? `${tournament.max_players} Players` : 'Unlimited'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <TeamDelegationsChart participants={participants} />
            </div>

            {/* Right Column: Stats & Charts (3/7) */}
            <div className="md:col-span-3 space-y-6">
              {/* Registration Progress */}
              <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium text-muted-foreground">Registration Capacity</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold mb-2">
                     {approvedParticipants.length} <span className="text-muted-foreground text-sm font-normal">/ {tournament.max_players || '∞'}</span>
                   </div>
                   <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-primary" 
                       style={{ width: `${Math.min(100, (approvedParticipants.length / (tournament.max_players || 100)) * 100)}%` }} 
                     />
                   </div>
                 </CardContent>
              </Card>

              <BeltDistributionChart participants={participants} />
              <GenderSplitChart participants={participants} />
            </div>
          </div>
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
              <CardDescription>Recently concluded matches.</CardDescription>
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
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
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
                View matches and results.
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

        {/* Stats Tab */}
        <TabsContent value="stats">
            <DivisionBreakdown matches={matches} />
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                Registered players grouped by team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PublicParticipantList participants={approvedParticipants} />
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
