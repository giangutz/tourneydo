"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Match, Tournament } from '@/types/models'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { Badge } from '@/components/ui/badge'

interface CourtManagerProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function CourtManager({ tournament, matches, participants }: CourtManagerProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

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

  const handleScoreMatch = (match: Match) => {
    setSelectedMatch(match)
    setDialogOpen(true)
  }

  if (!tournament.courts || tournament.courts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Court Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No courts configured for this tournament. Please update tournament settings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courts.map((courtNumber) => {
          const currentMatch = matches.find(
            (m) => m.court_number === courtNumber && m.status === 'in_progress'
          )

          return (
            <Card key={courtNumber} className={currentMatch ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Court {courtNumber}</span>
                  {currentMatch && (
                    <Badge variant="default" className="animate-pulse">Live</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentMatch ? (
                  <div className="space-y-4">
                    <div className="rounded-md bg-muted p-3">
                      <div className="text-sm font-medium text-muted-foreground mb-3 text-center">
                        Match #{currentMatch.match_number} (Round {currentMatch.round})
                      </div>
                      
                      <div className="space-y-4">
                        {/* Player 1 */}
                        <div className="flex flex-col items-center p-2 bg-background rounded border">
                          <span className="font-bold text-lg">
                            {getPlayerDisplay(currentMatch.player1_id).name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getPlayerDisplay(currentMatch.player1_id).team}
                          </span>
                        </div>

                        <div className="text-center font-bold text-muted-foreground text-sm">VS</div>

                        {/* Player 2 */}
                        <div className="flex flex-col items-center p-2 bg-background rounded border">
                          <span className="font-bold text-lg">
                            {getPlayerDisplay(currentMatch.player2_id).name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getPlayerDisplay(currentMatch.player2_id).team}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => handleScoreMatch(currentMatch)}
                    >
                      Score Match
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                    <span className="text-sm text-muted-foreground">Empty</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <MatchResultDialog 
        match={selectedMatch} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        participants={participants}
      />
    </>
  )
}
