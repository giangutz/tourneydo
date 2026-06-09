'use client'

import { Tournament, Match } from '@/types/models'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { calculateTournamentPhase } from '@/lib/utils/tournament-phases'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { HeroSection } from '@/components/tournaments/public/hero-section'
import { StatsGrid } from '@/components/tournaments/public/stats-grid'
import { StickyNav } from '@/components/tournaments/public/sticky-nav'
import { LayoutDashboard, Radio, GitBranch, Trophy, Users, BarChart3 } from 'lucide-react'
import { PublicParticipantList } from '@/components/tournaments/public-participant-list'
import { BracketView } from '@/components/tournaments/bracket-view'
import { LiveCourtsView } from '@/components/tournaments/live-courts-view'
import { MatchDetailsDialog } from '@/components/tournaments/match-details-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DivisionBreakdown } from '@/components/tournaments/shared/division-breakdown'
import { TeamDelegationsChart, BeltDistributionChart, GenderSplitChart } from '@/components/tournaments/overview/charts'
import { PlacementsView } from '@/components/tournaments/placements-view'
import { formatShortDate } from '@/lib/utils'
import { matches } from 'underscore'
import type { PlacementGroup } from '@/lib/db/queries/placements'

interface Participant {
  id: string
  player_id: string
  team_id: string
  division_id?: string
  category_id?: string
  status: 'pending' | 'verified' | 'paid'
  players: {
    first_name: string
    last_name: string
    belt_level: string | null
    gender: string | null
    avatar_url?: string
  }
  teams?: {
    id: string
    name: string
  } | null
}

interface PublicTournamentClientProps {
  tournament: Tournament
  matches: Match[]
  participants: Participant[]
  placementGroups: PlacementGroup[]
}

export function PublicTournamentClient({ tournament, matches: initialMatches, participants, placementGroups }: PublicTournamentClientProps) {
  // 1. Local State for High-Frequency Updates
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  // 2. Sync with Server Props (when router.refresh() does happen for other reasons)
  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  // 3. Realtime Reducer
  const handleMatchUpdate = (payload: any) => {
    
    if (payload.eventType === 'INSERT') {
       setMatches(prev => [...prev, payload.new as Match])
    } 
    else if (payload.eventType === 'UPDATE') {
       setMatches(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
    } 
    else if (payload.eventType === 'DELETE') {
       setMatches(prev => prev.filter(m => m.id !== payload.old.id))
    }
  }

  // 4. Subscribe with Handler
  useTournamentRealtime(tournament.id, handleMatchUpdate)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL State Management
  const currentView = searchParams.get('view') || 'overview'
  
  const handleTabChange = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    // Use replace to avoid history stack spam
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  // Local state for modals
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleMatchClick = (match: Match) => {
    // Ensure we use the latest version of the match from state if possible
    const latestMatch = matches.find(m => m.id === match.id) || match
    setSelectedMatch(latestMatch)
    setDetailsOpen(true)
  }

  // Data processing
  const approvedParticipants = participants.filter((p: Participant) => p.status === 'verified' || p.status === 'paid')
  const phase = calculateTournamentPhase(tournament)
  const isLiveOrDone = phase === 'ongoing' || phase === 'concluded'

  // Define Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    ...(isLiveOrDone ? [
      { id: 'live', label: 'Live Matches', icon: <Radio className="h-4 w-4" /> },
      { id: 'bracket', label: 'Bracket', icon: <GitBranch className="h-4 w-4" /> },
      { id: 'results', label: 'Results', icon: <Trophy className="h-4 w-4" /> },
      { id: 'stats', label: 'Stats', icon: <BarChart3 className="h-4 w-4" /> },
    ] : []),
    { id: 'participants', label: 'Participants', icon: <Users className="h-4 w-4" /> },
  ]

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 min-h-screen pb-20">
      
      {/* 1. Hero Section */}
      <HeroSection 
        tournament={tournament} 
        participantCount={approvedParticipants.length} 
      />

      {/* 2. Sticky Navigation */}
      <StickyNav 
        tabs={tabs} 
        activeTab={currentView} 
        onTabChange={handleTabChange}
        showLiveBadge={phase === 'ongoing'}
      />

      {/* 3. Content Area */}
      <div className="mt-6 space-y-6">
        
        {/* VIEW: OVERVIEW */}
        {currentView === 'overview' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <StatsGrid participants={participants} matches={matches} phase={phase} />

             <div className="grid gap-6 md:grid-cols-7">
               {/* Left Column: Details */}
               <div className="md:col-span-4 space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>Tournament Details</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <p className="text-sm text-muted-foreground leading-relaxed">
                       {tournament.description || 'No description provided.'}
                     </p>
                   </CardContent>
                 </Card>
                 <TeamDelegationsChart participants={participants} />
               </div>

               {/* Right Column: Charts */}
               <div className="md:col-span-3 space-y-6">
                 <BeltDistributionChart participants={participants} />
                 <GenderSplitChart participants={participants} />
               </div>
             </div>
           </div>
        )}

        {/* VIEW: LIVE MATCHES */}
        {currentView === 'live' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <LiveCourtsView
                tournament={tournament}
                matches={matches}
                participants={participants}
             />
             {(!tournament.courts || tournament.courts === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  No courts configured.
                </div>
             )}
          </div>
        )}

        {/* VIEW: BRACKET */}
        {currentView === 'bracket' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0">
                 {matches.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Bracket generation pending.
                    </div>
                  ) : (
                    <BracketView
                      matches={matches}
                      participants={participants}
                      onMatchClick={handleMatchClick}
                      tournamentType={tournament.tournament_type as any}
                    />
                  )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* VIEW: RESULTS */}
        {currentView === 'results' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">

              {/* Medal standings — shown once any division is complete */}
              {placementGroups.length > 0 && (
                <PlacementsView groups={placementGroups} />
              )}

              <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                 <Trophy className="h-5 w-5 text-yellow-500" />
                 Recent Results
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {matches
                    .filter((m: Match) => m.status === 'completed')
                    .sort((a: Match, b: Match) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .map((match: Match) => {
                       const p1 = participants.find((p: Participant) => p.player_id === match.player1_id)
                       const p2 = participants.find((p: Participant) => p.player_id === match.player2_id)
                       // Use optional chaining and default to TBD if player not found
                       const name1 = p1?.players ? `${p1.players.first_name} ${p1.players.last_name}` : 'TBD'
                       const name2 = p2?.players ? `${p2.players.first_name} ${p2.players.last_name}` : 'TBD'
                       const winnerId = match.winner_id
                       
                       return (
                         <Card key={match.id} onClick={() => handleMatchClick(match)} className="cursor-pointer hover:border-primary/50 transition-colors group">
                           <CardContent className="p-4">
                             <div className="flex justify-between text-xs text-muted-foreground mb-3">
                               <span>Match #{match.match_number}</span>
                               <span>{formatShortDate(match.updated_at)}</span>
                             </div>
                             <div className="space-y-2">
                               <div className={`flex justify-between items-center p-2 rounded ${winnerId === match.player1_id ? 'bg-primary/10 font-medium' : ''}`}>
                                  <span>{name1}</span>
                                  {winnerId === match.player1_id && <Trophy className="h-4 w-4 text-primary" />}
                               </div>
                               <div className={`flex justify-between items-center p-2 rounded ${winnerId === match.player2_id ? 'bg-primary/10 font-medium' : ''}`}>
                                  <span>{name2}</span>
                                  {winnerId === match.player2_id && <Trophy className="h-4 w-4 text-primary" />}
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       )
                    })
                 }
                 {matches.filter((m: Match) => m.status === 'completed').length === 0 && (
                   <p className="text-muted-foreground col-span-full text-center py-10">No completed matches yet.</p>
                 )}
              </div>
              </div>
           </div>
        )}

        {/* VIEW: STATS */}
        {currentView === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <DivisionBreakdown matches={matches} />
          </div>
        )}

        {/* VIEW: PARTICIPANTS */}
        {currentView === 'participants' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PublicParticipantList participants={approvedParticipants} />
           </div>
        )}

      </div>

      {/* Match Details Modal */}
      <MatchDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        match={selectedMatch}
        participants={participants}
        hideReadiness={true}
      />
    </div>
  )
}
