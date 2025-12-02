'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Match, Tournament } from '@/types/models'

interface LiveCourtsViewProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function LiveCourtsView({ tournament, matches, participants }: LiveCourtsViewProps) {
  const courts = Array.from({ length: tournament.courts || 0 }, (_, i) => i + 1)

  const getPlayerDisplay = (playerId: string | null) => {
    if (!playerId) return { name: 'BYE', team: null }
    const p = participants.find(p => p.player_id === playerId)
    if (!p) return { name: 'TBD', team: null }
    
    return {
      name: `${p.player.first_name} ${p.player.last_name}`,
      team: p.team?.name || 'Unattached'
    }
  }

  if (!tournament.courts || tournament.courts === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Live Courts</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courts.map((courtNumber) => {
          const currentMatch = matches.find(
            (m) => m.court_number === courtNumber && m.status === 'in_progress'
          )

          return (
            <Card key={courtNumber} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Court {courtNumber}</CardTitle>
                  {currentMatch && (
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {currentMatch ? (
                  <div className="text-center">
                    <div className="mb-4 text-sm text-muted-foreground">
                      Match #{currentMatch.match_number} • Round {currentMatch.round}
                    </div>
                    <div className="flex flex-col gap-6">
                      {/* Player 1 */}
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold">
                          {getPlayerDisplay(currentMatch.player1_id).name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getPlayerDisplay(currentMatch.player1_id).team}
                        </span>
                      </div>

                      <div className="text-muted-foreground font-bold text-lg">VS</div>

                      {/* Player 2 */}
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold">
                          {getPlayerDisplay(currentMatch.player2_id).name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getPlayerDisplay(currentMatch.player2_id).team}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    Waiting for next match...
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
