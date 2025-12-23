'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Match, Tournament } from '@/types/models'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { assignMatchToCourt, unassignMatch, updateMatchStatus } from '@/lib/actions/matches'
import { disqualifyParticipant } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { ArrowRightLeft, Trash2, XCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface CourtManagerProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
}

export function CourtManager({ tournament, matches, participants }: CourtManagerProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // State for Move/Remove actions
  const [matchToMove, setMatchToMove] = useState<Match | null>(null)
  const [matchToRemove, setMatchToRemove] = useState<Match | null>(null)
  const [targetCourt, setTargetCourt] = useState<string>("")
  const [isMoving, setIsMoving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  
  // DQ state
  const [playerToDQ, setPlayerToDQ] = useState<{ playerId: string; name: string; team: string; matchId: string } | null>(null)
  const [dqReason, setDQReason] = useState('')
  const [isDQing, setIsDQing] = useState(false)

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
      const result = await updateMatchStatus(match.id, match.tournament_id, 'in_progress')
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Match started")
      }
    } catch (error) {
      toast.error('Failed to start match')
    }
  }

  const handleConfirmMove = async () => {
    if (!matchToMove || !targetCourt) return

    setIsMoving(true)
    try {
      const courtNum = parseInt(targetCourt)
      
      // Determine status based on target court occupancy
      const isOccupied = matches.some(m => m.court_number === courtNum && m.status === 'in_progress')
      const status = isOccupied ? 'scheduled' : 'in_progress'

      const result = await assignMatchToCourt(matchToMove.id, matchToMove.tournament_id, courtNum, status)
      
      if (result.success) {
        toast.success(`Match moved to Court ${targetCourt}`)
        setMatchToMove(null)
        setTargetCourt("")
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to move match')
    } finally {
      setIsMoving(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!matchToRemove) return

    setIsRemoving(true)
    try {
      const result = await unassignMatch(matchToRemove.id, matchToRemove.tournament_id)
      
      if (result.success) {
        toast.success("Match removed from court")
        setMatchToRemove(null)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to remove match')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleConfirmDQ = async () => {
    if (!playerToDQ || !dqReason.trim()) {
      toast.error('Please provide a reason for disqualification')
      return
    }
    
    setIsDQing(true)
    try {
      const registration = participants.find(p => p.player_id === playerToDQ.playerId)
      if (!registration) {
        toast.error('Player registration not found')
        return
      }
      
      const result = await disqualifyParticipant(registration.id, tournament.id, dqReason)
      
      if (result.success) {
        toast.success(`${playerToDQ.name} disqualified. Match forfeited automatically.`)
        setPlayerToDQ(null)
        setDQReason('')
      } else {
        toast.error(result.error || 'Failed to disqualify player')
      }
    } catch (error) {
      toast.error('An error occurred during disqualification')
    } finally {
      setIsDQing(false)
    }
  }

  // Helper to check availability for the Move dialog
  const getAvailableCourts = () => {
    return courts.map(courtNum => {
      const courtMatches = matches.filter(m => m.court_number === courtNum)
      const isOccupied = courtMatches.some(m => m.status === 'in_progress')
      const queueSize = courtMatches.filter(m => m.status === 'scheduled').length
      return {
        courtNum,
        isOccupied,
        queueSize
      }
    })
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
            .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

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
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex flex-col flex-1">
                            <span className="font-bold text-lg">
                              {getPlayerDisplay(currentMatch.player1_id).name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getPlayerDisplay(currentMatch.player1_id).team}
                            </span>
                          </div>
                          {currentMatch.player1_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Disqualify player"
                              onClick={() => setPlayerToDQ({
                                playerId: currentMatch.player1_id!,
                                name: getPlayerDisplay(currentMatch.player1_id).name,
                                team: getPlayerDisplay(currentMatch.player1_id).team || 'Unattached',
                                matchId: currentMatch.id
                              })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="text-center font-bold text-muted-foreground text-sm">VS</div>

                        {/* Player 2 */}
                        <div className="flex items-center justify-between p-2 bg-background rounded border">
                          <div className="flex flex-col flex-1">
                            <span className="font-bold text-lg">
                              {getPlayerDisplay(currentMatch.player2_id).name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {getPlayerDisplay(currentMatch.player2_id).team}
                            </span>
                          </div>
                          {currentMatch.player2_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Disqualify player"
                              onClick={() => setPlayerToDQ({
                                playerId: currentMatch.player2_id!,
                                name: getPlayerDisplay(currentMatch.player2_id).name,
                                team: getPlayerDisplay(currentMatch.player2_id).team || 'Unattached',
                                matchId: currentMatch.id
                              })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => handleScoreMatch(currentMatch)}
                      >
                        Score
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Move to another court"
                        onClick={() => setMatchToMove(currentMatch)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        title="Remove from court"
                        onClick={() => setMatchToRemove(currentMatch)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                            {idx === 0 && !currentMatch ? (
                              <Button 
                                size="sm" 
                                className="w-full h-7 text-xs"
                                onClick={() => handleStartMatch(match)}
                              >
                                Start Match
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={() => setMatchToMove(match)}
                              >
                                Move
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="w-full h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setMatchToRemove(match)}
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

      {/* Move Match Dialog */}
      <Dialog open={!!matchToMove} onOpenChange={(open) => !open && setMatchToMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Match to Another Court</DialogTitle>
            <DialogDescription>
              Select a new court for Match #{matchToMove?.match_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={targetCourt} onValueChange={setTargetCourt}>
              <SelectTrigger>
                <SelectValue placeholder="Select target court" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCourts().map(({ courtNum, isOccupied, queueSize }) => (
                  <SelectItem 
                    key={courtNum} 
                    value={courtNum.toString()}
                    disabled={courtNum === matchToMove?.court_number}
                  >
                    Court {courtNum} {isOccupied ? `(Live + ${queueSize} in queue)` : `(Free + ${queueSize} in queue)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchToMove(null)}>Cancel</Button>
            <Button onClick={handleConfirmMove} disabled={!targetCourt || isMoving}>
              {isMoving ? 'Moving...' : 'Move Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!matchToRemove} onOpenChange={(open) => !open && setMatchToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Match from Court?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove Match #{matchToRemove?.match_number} from Court {matchToRemove?.court_number} and return it to the unassigned pool. It will not delete the match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} className="bg-destructive hover:bg-destructive/90">
              {isRemoving ? 'Removing...' : 'Remove Match'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DQ Confirmation Dialog */}
      <AlertDialog open={!!playerToDQ} onOpenChange={(open) => {
        if (!open) {
          setPlayerToDQ(null)
          setDQReason('')
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disqualify Player?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to disqualify <strong>{playerToDQ?.name}</strong> ({playerToDQ?.team}).
              <br /><br />
              <span className="text-destructive font-semibold">This will automatically forfeit the match and advance the opponent to the next round.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="dq-reason" className="text-sm font-medium">
              Reason for Disqualification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="dq-reason"
              placeholder="e.g., Weight violation, Unsportsmanlike conduct, No-show..."
              value={dqReason}
              onChange={(e) => setDQReason(e.target.value)}
              className="mt-2 min-h-[80px]"
              disabled={isDQing}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDQing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDQ} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDQing || !dqReason.trim()}
            >
              {isDQing ? 'Disqualifying...' : 'Confirm Disqualification'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
