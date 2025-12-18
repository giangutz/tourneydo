'use client'

import { Tournament, Match, Team } from '@/types/models'

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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
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


    </div>
  )
}
