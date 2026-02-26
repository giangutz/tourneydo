'use client'

/**
 * Athlete Merge UI
 *
 * Lets a tournament organizer review groups of player records that appear to
 * represent the same physical athlete (matched on normalised first name, last
 * name, and date of birth) and confirm a merge that links all of them to a
 * single `global_athletes` record.
 *
 * Designed to be embedded in the organizer dashboard settings or analytics tab.
 */

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Users, Link2, Check, X, Loader2, GitMerge } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { getDedupCandidatesAction, confirmMergeAction } from '@/lib/actions/merge-athletes'
import type { DedupCandidate, PlayerWithTeam } from '@/lib/db/queries/global-athletes'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MergeDialogState {
  candidate: DedupCandidate
  players: PlayerWithTeam[]
  canonicalFirst: string
  canonicalLast: string
  notes: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AthleteMergeUI() {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<DedupCandidate[]>([])
  const [playerMap, setPlayerMap] = useState<Map<string, PlayerWithTeam>>(new Map())
  const [mergeDialog, setMergeDialog] = useState<MergeDialogState | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadCandidates = async () => {
    setLoading(true)
    const result = await getDedupCandidatesAction()
    if (result.success) {
      setCandidates(result.data.candidates)
      const map = new Map<string, PlayerWithTeam>()
      for (const p of result.data.players) map.set(p.id, p)
      setPlayerMap(map)
    } else {
      toast.error('Failed to load dedup candidates')
    }
    setLoading(false)
  }

  useEffect(() => { loadCandidates() }, [])

  const openMergeDialog = (candidate: DedupCandidate) => {
    const players = candidate.playerIds
      .map(id => playerMap.get(id))
      .filter((p): p is PlayerWithTeam => p !== undefined)

    // Pre-populate with the first player's name (title-cased)
    const first = players[0]
    const toTitle = (s: string) =>
      s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

    setMergeDialog({
      candidate,
      players,
      canonicalFirst: first ? toTitle(candidate.normFirst) : '',
      canonicalLast: first ? toTitle(candidate.normLast) : '',
      notes: '',
    })
  }

  const handleConfirmMerge = () => {
    if (!mergeDialog) return

    startTransition(async () => {
      const result = await confirmMergeAction(
        mergeDialog.candidate.playerIds,
        mergeDialog.canonicalFirst,
        mergeDialog.canonicalLast,
        mergeDialog.candidate.dateOfBirth,
        null,
        mergeDialog.notes || undefined
      )

      if (result.success) {
        toast.success(
          `Merged ${mergeDialog.candidate.playerCount} records into one global athlete`
        )
        setMergeDialog(null)
        await loadCandidates()
      } else {
        toast.error(result.error ?? 'Merge failed')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading duplicate candidates…</span>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <Check className="h-8 w-8 text-green-500" />
          <p className="font-medium">No duplicate athletes found</p>
          <p className="text-sm text-muted-foreground">
            All player records appear to be unique.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            <CardTitle>Athlete Deduplication</CardTitle>
          </div>
          <CardDescription>
            The following groups of player records share the same name and date of birth
            across different coaches. Review each group and confirm whether they represent
            the same physical athlete. Merging links them to a single global record used
            for cross-tournament analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.map((candidate, i) => {
            const players = candidate.playerIds
              .map(id => playerMap.get(id))
              .filter((p): p is PlayerWithTeam => p !== undefined)

            return (
              <div
                key={i}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold capitalize">
                      {candidate.normFirst} {candidate.normLast}
                    </span>
                    {candidate.dateOfBirth && (
                      <span className="text-sm text-muted-foreground">
                        · DOB: {candidate.dateOfBirth}
                      </span>
                    )}
                    <Badge variant="secondary">{candidate.playerCount} records</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMergeDialog(candidate)}
                  >
                    <Link2 className="mr-1 h-3 w-3" /> Review &amp; Merge
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Belt</TableHead>
                      <TableHead>Team / Club</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Linked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell>{p.beltLevel ?? '—'}</TableCell>
                        <TableCell>{p.teamName ?? '—'}</TableCell>
                        <TableCell>{p.coachName ?? '—'}</TableCell>
                        <TableCell>
                          {p.globalAthleteId ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Merge confirmation dialog */}
      <Dialog open={!!mergeDialog} onOpenChange={open => { if (!open) setMergeDialog(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Athlete Merge</DialogTitle>
            <DialogDescription>
              The {mergeDialog?.candidate.playerCount} records below will be linked to a
              single global athlete identity. Verify the canonical name before confirming.
            </DialogDescription>
          </DialogHeader>

          {mergeDialog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="canon-first">Canonical First Name</Label>
                  <Input
                    id="canon-first"
                    value={mergeDialog.canonicalFirst}
                    onChange={e =>
                      setMergeDialog(d => d ? { ...d, canonicalFirst: e.target.value } : d)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="canon-last">Canonical Last Name</Label>
                  <Input
                    id="canon-last"
                    value={mergeDialog.canonicalLast}
                    onChange={e =>
                      setMergeDialog(d => d ? { ...d, canonicalLast: e.target.value } : d)
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="merge-notes">Notes (optional)</Label>
                <Input
                  id="merge-notes"
                  placeholder="e.g. Confirmed via ID check at 2026 Nationals"
                  value={mergeDialog.notes}
                  onChange={e =>
                    setMergeDialog(d => d ? { ...d, notes: e.target.value } : d)
                  }
                />
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Coach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergeDialog.players.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell>{p.teamName ?? '—'}</TableCell>
                        <TableCell>{p.coachName ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMerge}
              disabled={
                isPending ||
                !mergeDialog?.canonicalFirst.trim() ||
                !mergeDialog?.canonicalLast.trim()
              }
            >
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Merging…</>
              ) : (
                <><GitMerge className="mr-2 h-4 w-4" /> Confirm Merge</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
