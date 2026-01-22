'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Match, MatchWithReadiness } from '@/types/models'
import { AthleteReadinessToggle } from '@/components/tournaments/athlete-readiness-toggle'
import { Badge } from '@/components/ui/badge'
import { UserCheck, Users } from 'lucide-react'

interface MatchReadinessDialogProps {
  match: MatchWithReadiness | Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
}

export function MatchReadinessDialog({ match, open, onOpenChange, participants }: MatchReadinessDialogProps) {
  const typedMatch = match as MatchWithReadiness

  if (!match) return null

  const getPlayerInfo = (playerId: string | null) => {
    if (!playerId) return { name: 'TBD', team: null }
    const participant = participants.find(p => p.player_id === playerId)
    if (!participant) return { name: 'Unknown', team: null }
    return {
      name: `${participant.player.first_name} ${participant.player.last_name}`,
      team: participant.team?.name || 'Unattached'
    }
  }

  const player1 = getPlayerInfo(match.player1_id)
  const player2 = getPlayerInfo(match.player2_id)

  const isContest = typedMatch?.lifecycle_state === 'CONTEST'
  const athlete1Called = typedMatch?.athlete1_called || false
  const athlete2Called = typedMatch?.athlete2_called || false
  const bothReady = athlete1Called && athlete2Called

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Athlete Readiness
          </DialogTitle>
          <DialogDescription>
            Mark athletes as present and ready to compete
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">
              Match #{match.match_number_formatted || match.match_number}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="font-semibold">{player1.name}</div>
                <div className="text-xs text-muted-foreground">{player1.team}</div>
              </div>
              <div className="text-xs font-bold text-muted-foreground bg-background px-3 py-1 rounded border">
                VS
              </div>
              <div className="flex-1 text-right">
                <div className="font-semibold">{player2.name}</div>
                <div className="text-xs text-muted-foreground">{player2.team}</div>
              </div>
            </div>
          </div>

          {/* Readiness Status */}
          {isContest ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Readiness Status</h3>
                <Badge variant={bothReady ? "default" : "secondary"} className="gap-1">
                  <Users className="h-3 w-3" />
                  {bothReady ? 'Both Ready' : athlete1Called || athlete2Called ? 'Partially Ready' : 'Not Ready'}
                </Badge>
              </div>

              {/* Athlete 1 Toggle */}
              {match.player1_id && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{player1.name}</div>
                    <div className="text-xs text-muted-foreground">{player1.team}</div>
                  </div>
                  <AthleteReadinessToggle
                    matchId={match.id}
                    athleteId={match.player1_id}
                    athleteName={player1.name}
                    called={athlete1Called}
                    disabled={false}
                    compact={false}
                  />
                </div>
              )}

              {/* Athlete 2 Toggle */}
              {match.player2_id && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{player2.name}</div>
                    <div className="text-xs text-muted-foreground">{player2.team}</div>
                  </div>
                  <AthleteReadinessToggle
                    matchId={match.id}
                    athleteId={match.player2_id}
                    athleteName={player2.name}
                    called={athlete2Called}
                    disabled={false}
                    compact={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Readiness management is only available for matches in CONTEST state.</p>
              <p className="text-sm mt-2">Current state: <Badge variant="outline">{typedMatch?.lifecycle_state || 'UNKNOWN'}</Badge></p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
