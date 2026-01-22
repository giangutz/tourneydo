'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Match, MatchWithReadiness } from '@/types/models'
import { fetchMatchRounds } from '@/lib/actions/fetch-match-rounds'
import { Loader2, Trophy, CheckCircle2, UserCheck } from 'lucide-react'
import { AthleteReadinessToggle, ReadinessStatusBadge } from '@/components/tournaments/athlete-readiness-toggle'

interface MatchDetailsDialogProps {
  match: MatchWithReadiness | Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
}

interface RoundData {
  id: string
  round_number: number
  score_player1: number | null
  score_player2: number | null
  winner_id: string | null
  status: string | null
}

export function MatchDetailsDialog({ match, open, onOpenChange, participants }: MatchDetailsDialogProps) {
  const typedMatch = match as MatchWithReadiness
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (match && open) {
      loadRounds()
    }
  }, [match, open])

  const loadRounds = async () => {
    if (!match) return
    
    setLoading(true)
    try {
      const roundsData = await fetchMatchRounds(match.id)
      setRounds(roundsData)
    } catch (error) {
      console.error('Failed to load rounds:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!match) return null

  const p1 = participants.find(p => p.player_id === match.player1_id)
  const p2 = participants.find(p => p.player_id === match.player2_id)
  
  const name1 = p1 ? `${p1.player.first_name} ${p1.player.last_name}` : 'TBD'
  const name2 = p2 ? `${p2.player.first_name} ${p2.player.last_name}` : 'TBD'

  // Calculate round wins from loaded rounds
  let player1Wins = 0
  let player2Wins = 0

  rounds.forEach(round => {
    if (round.winner_id === match.player1_id) player1Wins++
    else if (round.winner_id === match.player2_id) player2Wins++
  })

  const overallWinner = player1Wins >= 2 ? name1 : player2Wins >= 2 ? name2 : null

  const getRoundWinner = (round: RoundData) => {
    if (round.winner_id === match.player1_id) return name1
    if (round.winner_id === match.player2_id) return name2
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Match Details - Best of 3</DialogTitle>
            {typedMatch && typedMatch.lifecycle_state === 'CONTEST' && (
              <ReadinessStatusBadge 
                athlete1Called={typedMatch.athlete1_called || false}
                athlete2Called={typedMatch.athlete2_called || false}
              />
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {match.status === 'completed' ? 'Match Completed' : 'Match In Progress'}
          </div>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Athlete Readiness Section */}
            {typedMatch && typedMatch.lifecycle_state === 'CONTEST' && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Athlete Readiness (Operational Gate)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase">Athlete 1</div>
                      <AthleteReadinessToggle
                        matchId={typedMatch.id}
                        athleteId={typedMatch.player1_id || ''}
                        athleteName={name1}
                        called={typedMatch.athlete1_called || false}
                        disabled={!typedMatch.player1_id}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase text-right">Athlete 2</div>
                      <div className="flex justify-end">
                        <AthleteReadinessToggle
                          matchId={typedMatch.id}
                          athleteId={typedMatch.player2_id || ''}
                          athleteName={name2}
                          called={typedMatch.athlete2_called || false}
                          disabled={!typedMatch.player2_id}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall Score */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <div className="font-bold text-lg">{name1}</div>
                    <div className="text-3xl font-bold mt-2">{player1Wins}</div>
                  </div>
                  <div className="text-center text-muted-foreground font-semibold">
                    ROUNDS WON
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{name2}</div>
                    <div className="text-3xl font-bold mt-2">{player2Wins}</div>
                  </div>
                </div>
                {overallWinner && (
                  <div className="mt-4 text-center">
                    <Badge className="text-sm py-1 px-3">
                      <Trophy className="h-4 w-4 mr-1" />
                      Winner: {overallWinner}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Round Details */}
            {rounds.map((round) => (
              <Card key={round.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Round {round.round_number}</h3>
                    {getRoundWinner(round) && (
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {getRoundWinner(round)}
                      </Badge>
                    )}
                    {round.status === 'pending' && (
                      <Badge variant="outline">Not Started</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">{name1}</div>
                      <div className="text-3xl font-bold">{round.score_player1 ?? 0}</div>
                    </div>
                    <div className="text-center font-bold text-muted-foreground">VS</div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">{name2}</div>
                      <div className="text-3xl font-bold">{round.score_player2 ?? 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
