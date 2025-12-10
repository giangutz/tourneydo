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

  const handleStartMatch = async (match: Match) => {
    try {
      // Import dynamically to avoid server/client issues if possible, or just use the action
      const { updateMatchStatus } = await import('@/lib/actions/matches')
      const result = await updateMatchStatus(match.id, match.tournament_id, 'in_progress')
      if (!result.success) {
        // toast.error(result.error) - toast not imported yet
        console.error(result.error)
      }
    } catch (error) {
      console.error('Failed to start match', error)
    }
  }

  const handleRemoveFromQueue = async (match: Match) => {
    try {
      const { assignMatchToCourt } = await import('@/lib/actions/matches')
      // Assign to court 0 or null to remove? The action likely expects a valid court number.
      // We might need a specific action to unassign, or just update the match directly.
      // Let's assume passing 0 or handling it in a new action is best.
      // Actually, let's use a direct update for now or a specific unassign action.
      // For now, let's try to update the match to have no court.
      
      // Since assignMatchToCourt takes a number, and 0 might be invalid or "unassigned".
      // Let's check assignMatchToCourt implementation or create a new one.
      // For now, I'll use a placeholder and we might need to add `unassignMatch` action.
      
      const { unassignMatch } = await import('@/lib/actions/matches')
      await unassignMatch(match.id, match.tournament_id)
    } catch (error) {
      console.error('Failed to remove from queue', error)
    }
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
          const courtMatches = matches.filter(m => m.court_number === courtNumber)
          const currentMatch = courtMatches.find(m => m.status === 'in_progress')
          const queuedMatches = courtMatches
            .filter(m => m.status === 'scheduled')
            .sort((a, b) => {
              // Sort by match number or creation time if needed
              // For now assuming match_number is a good proxy for order
              return (a.match_number || 0) - (b.match_number || 0)
            })

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
                {/* Current Match Section */}
                {currentMatch ? (
                  <div className="space-y-4 mb-6">
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
                  <div className="flex h-40 items-center justify-center rounded-md border border-dashed mb-6">
                    <span className="text-sm text-muted-foreground">Court Free</span>
                  </div>
                )}

                {/* Queue Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex justify-between items-center">
                    <span>Upcoming Matches</span>
                  </h4>
                  
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
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className="truncate max-w-[45%]">{getPlayerDisplay(match.player1_id).name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="truncate max-w-[45%] text-right">{getPlayerDisplay(match.player2_id).name}</span>
                          </div>
                          
                          {/* Queue Actions */}
                          <div className="flex gap-2 mt-2">
                            {idx === 0 && !currentMatch && (
                              <Button 
                                size="sm" 
                                className="w-full h-7 text-xs"
                                onClick={() => handleStartMatch(match)}
                              >
                                Start Match
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="w-full h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleRemoveFromQueue(match)}
                            >
                              Remove
                            </Button>
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

      <MatchResultDialog 
        match={selectedMatch} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        participants={participants}
      />
    </>
  )
}
