'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Match, Tournament, MatchWithReadiness } from '@/types/models'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { Badge } from '@/components/ui/badge'
import { ReadinessStatusBadge } from '@/components/tournaments/athlete-readiness-toggle'
import { isMatchReady } from '@/lib/utils/match-lifecycle'
import { broadcastManager } from '@/lib/realtime/broadcast'
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
import { assignMatchToCourt, unassignMatch, updateMatchStatus, returnMatchToQueue } from '@/lib/actions/matches'
import { disqualifyParticipant } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { ArrowRightLeft, Trash2, XCircle, Monitor, ChevronLeft, ChevronRight, RotateCcw, Printer } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LiveDisplayMode } from '@/components/tournaments/live-display-mode'

interface CourtParticipant {
  id: string
  player_id: string
  player: { first_name: string; last_name: string }
  team?: { name: string }
}

interface CourtManagerProps {
  tournament: Tournament
  matches: MatchWithReadiness[] | Match[]
  participants: CourtParticipant[]
}

export function CourtManager({ tournament, matches, participants }: CourtManagerProps) {
  const typedMatches = matches as MatchWithReadiness[]
  const [selectedMatch, setSelectedMatch] = useState<MatchWithReadiness | null>(null)
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

  // Return to queue state
  const [matchToReturnToQueue, setMatchToReturnToQueue] = useState<Match | null>(null)
  const [isReturningToQueue, setIsReturningToQueue] = useState(false)
  
  // Live display mode state
  const [liveDisplayMode, setLiveDisplayMode] = useState(false)

  // Court pagination state
  const [courtPage, setCourtPage] = useState<Record<number, number>>({})
  const ITEMS_PER_PAGE = 3

  const courts = Array.from({ length: tournament.courts || 0 }, (_, i) => i + 1)

  // --- Memoized lookups (computed once per data change instead of O(courts ×
  //     matches) on every render) ---

  // playerId -> participant, for O(1) name/team display.
  const participantByPlayerId = useMemo(() => {
    const map = new Map<string, CourtParticipant>()
    for (const p of participants) map.set(p.player_id, p)
    return map
  }, [participants])

  // matchId -> match, so isMatchReady() resolves source matches in O(sources)
  // rather than scanning all matches on every readiness check.
  const matchById = useMemo(() => {
    const map = new Map<string, MatchWithReadiness>()
    for (const m of typedMatches) map.set(m.id, m)
    return map
  }, [typedMatches])

  // court -> { current match, sorted queue }. Built in one O(matches) pass.
  const courtData = useMemo(() => {
    const map = new Map<number, { current: MatchWithReadiness | null; queued: MatchWithReadiness[] }>()
    for (const courtNumber of courts) map.set(courtNumber, { current: null, queued: [] })
    for (const m of typedMatches) {
      if (m.court_number == null) continue
      const bucket = map.get(m.court_number)
      if (!bucket) continue
      if (m.status === 'in_progress') bucket.current = m
      else if (m.status === 'scheduled') bucket.queued.push(m)
    }
    for (const bucket of map.values()) {
      bucket.queued.sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedMatches, tournament.courts])

  // Per-court availability summary for the Move dialog.
  const availableCourts = useMemo(
    () =>
      courts.map((courtNum) => {
        const bucket = courtData.get(courtNum)
        return {
          courtNum,
          isOccupied: !!bucket?.current,
          queueSize: bucket?.queued.length ?? 0,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courtData, tournament.courts]
  )

  const getPlayerDisplay = (playerId: string | null) => {
    if (!playerId) return { name: 'BYE', team: null }
    const p = participantByPlayerId.get(playerId)
    if (!p) return { name: 'TBD', team: null }

    return {
      name: `${p.player.first_name} ${p.player.last_name}`,
      team: p.team?.name || 'Unattached'
    }
  }

  const handleScoreMatch = (match: MatchWithReadiness) => {
    setSelectedMatch(match)
    setDialogOpen(true)
  }

  const handleStartMatch = async (match: MatchWithReadiness) => {
    // Check readiness (operational gate)
    const readinessResult = isMatchReady(
      match,
      matchById,
      new Map(), // Empty court status for now
      { athlete1Called: match.athlete1_called || false, athlete2Called: match.athlete2_called || false }
    )

    if (!readinessResult.isReady) {
      toast.error(
        <div className="space-y-1">
          <p className="font-semibold text-sm">Match not ready</p>
          <ul className="text-xs list-disc pl-4">
            {readinessResult.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )
      return
    }

    try {
      const result = await updateMatchStatus(match.id, match.tournament_id, 'in_progress')
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Match started")
        broadcastManager.publish(match.tournament_id, 'bracket_update', { matchId: match.id, status: 'in_progress' })
      }
    } catch (error) {
      toast.error('Failed to start match', { description: (error as Error).message })
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
        broadcastManager.publish(matchToMove.tournament_id, 'bracket_update', { matchId: matchToMove.id, court: targetCourt })
        setMatchToMove(null)
        setTargetCourt("")
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to move match', { description: (error as Error).message })
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
        broadcastManager.publish(matchToRemove.tournament_id, 'bracket_update', { matchId: matchToRemove.id, status: 'removed' })
        setMatchToRemove(null)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to remove match', { description: (error as Error).message })
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
        broadcastManager.publish(tournament.id, 'score_update', { matchId: playerToDQ.matchId, disqualified: true })
        setPlayerToDQ(null)
        setDQReason('')
      } else {
        toast.error(result.error || 'Failed to disqualify player')
      }
    } catch (error) {
      toast.error('An error occurred during disqualification', { description: (error as Error).message })
    } finally {
      setIsDQing(false)
    }
  }

  const handleConfirmReturnToQueue = async () => {
    if (!matchToReturnToQueue) return

    setIsReturningToQueue(true)
    try {
      const result = await returnMatchToQueue(matchToReturnToQueue.id, matchToReturnToQueue.tournament_id)
      if (result.success) {
        toast.success("Match returned to queue")
        broadcastManager.publish(matchToReturnToQueue.tournament_id, 'bracket_update', { matchId: matchToReturnToQueue.id, status: 'scheduled' })
        setMatchToReturnToQueue(null)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Failed to return match to queue')
    } finally {
      setIsReturningToQueue(false)
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

  // Render live display mode if active
  if (liveDisplayMode) {
    return (
      <LiveDisplayMode
        tournament={tournament}
        matches={matches}
        participants={participants}
        onClose={() => setLiveDisplayMode(false)}
      />
    )
  }

  return (
    <>
      {/* Live Display Toggle Button */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setLiveDisplayMode(true)}
          variant="outline"
          className="gap-2"
        >
          <Monitor className="h-4 w-4" />
          Live Display Mode
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {courts.map((courtNumber) => {
          const bucket = courtData.get(courtNumber)
          const currentMatch = bucket?.current ?? null
          const queuedMatches = bucket?.queued ?? []

          // Pagination logic
          const currentCourtPage = courtPage[courtNumber] || 1
          const totalPages = Math.ceil(queuedMatches.length / ITEMS_PER_PAGE)
          
          // Slice matches for display, but keep original indices logic if needed
          const displayMatches = queuedMatches.slice(
            (currentCourtPage - 1) * ITEMS_PER_PAGE,
            currentCourtPage * ITEMS_PER_PAGE
          )

          return (
            <Card key={courtNumber} className={currentMatch ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <div className="flex flex-col">
                    <span>Court {courtNumber}</span>

                  </div>
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
                        Match #{currentMatch.match_number}
                      </div>
                      
                      <div className="space-y-4">
                        {/* Player 1 */}
                        <div className="space-y-2">
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

                        </div>

                        <div className="text-center font-bold text-muted-foreground text-sm">VS</div>

                        {/* Player 2 */}
                        <div className="space-y-2">
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleScoreMatch(currentMatch)}
                      >
                        Score
                      </Button>
                      {currentMatch.player1_id && currentMatch.player2_id && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Print match slip"
                          className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:border-violet-300"
                          onClick={() => window.open(
                            `/print/tournament/${currentMatch.tournament_id}?mode=slip&match=${currentMatch.id}`,
                            '_blank'
                          )}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        title="Move to another court"
                        onClick={() => setMatchToMove(currentMatch)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Return to queue"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => setMatchToReturnToQueue(currentMatch)}
                      >
                        <RotateCcw className="h-4 w-4" />
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
                      {displayMatches.map((match, idx) => (
                        <div key={match.id} className="text-sm border rounded p-2 bg-muted/20">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-xs">Match #{match.match_number}</span>
                            <div className="flex gap-1">
                              <ReadinessStatusBadge 
                                athlete1Called={match.athlete1_called || false}
                                athlete2Called={match.athlete2_called || false}
                                compact={true}
                              />
                              {idx === 0 && !currentMatch && currentCourtPage === 1 && (
                                <Badge variant="outline" className="text-[10px] h-5">Next</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start text-xs mb-2 gap-1 md:gap-0">
                            <div className="flex flex-col w-full md:max-w-[45%]">
                              <span className="truncate font-medium">{getPlayerDisplay(match.player1_id).name}</span>
                              <span className="truncate text-[10px] text-muted-foreground">{getPlayerDisplay(match.player1_id).team}</span>
                            </div>
                            <span className="text-muted-foreground text-[10px] md:mt-1 self-center md:self-auto">vs</span>
                            <div className="flex flex-col w-full md:items-end md:max-w-[45%]">
                              <span className="truncate font-medium md:text-right">{getPlayerDisplay(match.player2_id).name}</span>
                              <span className="truncate text-[10px] text-muted-foreground md:text-right">{getPlayerDisplay(match.player2_id).team}</span>
                            </div>
                          </div>
                          
                          
                          {/* Queue Actions */}
                          <div className="flex gap-2 mt-2">
                            {!currentMatch && (() => {
                              // Check if this specific match is ready to start
                              const readinessResult = isMatchReady(
                                match,
                                matchById,
                                new Map(), // Empty court status for now
                                { 
                                  athlete1Called: match.athlete1_called || false, 
                                  athlete2Called: match.athlete2_called || false 
                                }
                              )
                              
                              return readinessResult.isReady ? (
                                <Button 
                                  size="sm" 
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => handleStartMatch(match)}
                                  title="Both athletes ready - can start now"
                                >
                                  Start Match
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => setMatchToMove(match)}
                                  title={readinessResult.blockedReasons.join(', ')}
                                >
                                  Move
                                </Button>
                              )
                            })()}
                            {currentMatch && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => setMatchToMove(match)}
                              >
                                Move
                              </Button>
                            )}
                            {match.player1_id && match.player2_id && (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:border-violet-300 shrink-0"
                                title="Print match slip"
                                onClick={() => window.open(
                                  `/print/tournament/${match.tournament_id}?mode=slip&match=${match.id}`,
                                  '_blank'
                                )}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => setMatchToRemove(match)}
                              title="Remove from court"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                {availableCourts.map(({ courtNum, isOccupied, queueSize }) => (
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

      {/* Return to Queue Confirmation Dialog */}
      <AlertDialog open={!!matchToReturnToQueue} onOpenChange={(open) => !open && setMatchToReturnToQueue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Match to Queue?</AlertDialogTitle>
            <AlertDialogDescription>
              Match #{matchToReturnToQueue?.match_number} will be moved back to the queue on Court {matchToReturnToQueue?.court_number}. The match status will revert to scheduled and can be restarted when ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReturnToQueue}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isReturningToQueue ? 'Returning...' : 'Return to Queue'}
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
              className="mt-2 min-h-20"
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
