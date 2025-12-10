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
          const courtMatches = matches.filter(m => m.court_number === courtNumber)
          const currentMatch = courtMatches.find(m => m.status === 'in_progress')
          const queuedMatches = courtMatches
            .filter(m => m.status === 'scheduled')
            .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

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
                  <div className="text-center mb-6">
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
                  <div className="flex h-32 items-center justify-center text-muted-foreground mb-6">
                    Waiting for next match...
                  </div>
                )}

                {/* Upcoming Matches Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Upcoming Matches</h4>
                  
                  {queuedMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No upcoming matches</p>
                  ) : (
                    <div className="space-y-3">
                      {queuedMatches.map((match, idx) => (
                        <div key={match.id} className="text-sm border rounded p-2 bg-muted/20">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-xs">Match #{match.match_number}</span>
                            {idx === 0 && !currentMatch && (
                              <Badge variant="outline" className="text-[10px] h-5">Next</Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="truncate max-w-[45%]">{getPlayerDisplay(match.player1_id).name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="truncate max-w-[45%] text-right">{getPlayerDisplay(match.player2_id).name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
