'use client'

import { Tournament, Match, Team } from '@/types/models'
import { BracketView } from '@/components/tournaments/bracket-view'
import { Card, CardContent } from '@/components/ui/card'
import { CourtManager } from '@/components/tournaments/court-manager'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'

interface OrganizerMatchesClientProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function OrganizerMatchesClient({ tournament, matches, participants }: OrganizerMatchesClientProps) {
  useTournamentRealtime(tournament.id)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Live Courts</h2>
          <CourtManager 
            tournament={tournament} 
            matches={matches} 
            participants={participants} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 overflow-x-auto">
          {matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Bracket has not been generated yet.
            </div>
          ) : (
            <BracketView 
              matches={matches} 
              participants={participants}
              tournamentType={tournament.tournament_type as 'standard' | 'open-belt'}
              isOrganizer={true}
              courts={tournament.courts || 0}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
