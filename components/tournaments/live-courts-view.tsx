'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Match, Tournament } from '@/types/models'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface LiveCourtsViewProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function LiveCourtsView({ tournament, matches, participants }: LiveCourtsViewProps) {
  const courts = Array.from({ length: tournament.courts || 0 }, (_, i) => i + 1)
  const [courtPage, setCourtPage] = useState<Record<number, number>>({})
  const ITEMS_PER_PAGE = 3

  const getPlayerDisplay = (match: Match, side: 'player1' | 'player2') => {
    const playerId = side === 'player1' ? match.player1_id : match.player2_id
    const playerObj = side === 'player1' ? match.player1 : match.player2
    
    if (!playerId) return { name: 'BYE', team: null }

    // Try to find in participants list first (for Team info)
    const p = participants.find(p => p.player_id === playerId || p.player?.id === playerId)
    if (p) {
        return {
            name: `${p.player.first_name} ${p.player.last_name}`,
            team: p.team?.name || 'Unattached'
        }
    }

    // Fallback to match data
    if (playerObj) {
         return {
            name: `${playerObj.first_name} ${playerObj.last_name}`,
            team: 'TBD' // We don't have team in match object
        }
    }
    
    return { name: 'TBD', team: null }
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
                      Match #{currentMatch.match_number}
                    </div>
                    <div className="flex flex-col gap-6">
                      {/* Player 1 */}
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold">
                          {getPlayerDisplay(currentMatch, 'player1').name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getPlayerDisplay(currentMatch, 'player1').team}
                        </span>
                      </div>

                      <div className="text-muted-foreground font-bold text-lg">VS</div>

                      {/* Player 2 */}
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold">
                          {getPlayerDisplay(currentMatch, 'player2').name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getPlayerDisplay(currentMatch, 'player2').team}
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
                  ) : (() => {
                    const currentCourtPage = courtPage[courtNumber] || 1
                    const totalPages = Math.ceil(queuedMatches.length / ITEMS_PER_PAGE)
                    const displayMatches = queuedMatches.slice(
                      (currentCourtPage - 1) * ITEMS_PER_PAGE,
                      currentCourtPage * ITEMS_PER_PAGE
                    )

                    return (
                      <>
                        <div className="space-y-3">
                          {displayMatches.map((match, idx) => (
                            <div key={match.id} className="text-sm border rounded p-2 bg-muted/20">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-xs">Match #{match.match_number}</span>
                                {idx === 0 && !currentMatch && currentCourtPage === 1 && (
                                  <Badge variant="outline" className="text-[10px] h-5">Next</Badge>
                                )}
                              </div>
                              <div className="flex flex-col md:flex-row md:justify-between md:items-start text-xs mb-2 gap-1 md:gap-0">
                                <div className="flex flex-col w-full md:max-w-[45%]">
                                  <span className="truncate font-medium">{getPlayerDisplay(match, 'player1').name}</span>
                                  <span className="truncate text-[10px] text-muted-foreground">{getPlayerDisplay(match, 'player1').team}</span>
                                </div>
                                <span className="text-muted-foreground text-[10px] md:mt-1 self-center md:self-auto">vs</span>
                                <div className="flex flex-col w-full md:items-end md:max-w-[45%]">
                                  <span className="truncate font-medium md:text-right">{getPlayerDisplay(match, 'player2').name}</span>
                                  <span className="truncate text-[10px] text-muted-foreground md:text-right">{getPlayerDisplay(match, 'player2').team}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={currentCourtPage === 1}
                              onClick={() => setCourtPage(prev => ({ ...prev, [courtNumber]: currentCourtPage - 1 }))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Page {currentCourtPage} of {totalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={currentCourtPage === totalPages}
                              onClick={() => setCourtPage(prev => ({ ...prev, [courtNumber]: currentCourtPage + 1 }))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
