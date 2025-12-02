'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Match } from '@/types/models'
import { updateMatchParticipants } from '@/lib/actions/matches'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface EditMatchDialogProps {
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
  tournamentId: string
}

export function EditMatchDialog({ match, open, onOpenChange, participants, tournamentId }: EditMatchDialogProps) {
  const [loading, setLoading] = useState(false)
  const [player1Id, setPlayer1Id] = useState<string>('tbd')
  const [player2Id, setPlayer2Id] = useState<string>('tbd')

  useEffect(() => {
    if (match && open) {
      setPlayer1Id(match.player1_id || 'tbd')
      setPlayer2Id(match.player2_id || 'tbd')
    }
  }, [match, open])

  const handleSave = async () => {
    if (!match) return

    setLoading(true)
    try {
      const p1 = player1Id === 'tbd' ? null : player1Id
      const p2 = player2Id === 'tbd' ? null : player2Id

      const result = await updateMatchParticipants(match.id, tournamentId, p1, p2)

      if (result.success) {
        toast.success('Match participants updated')
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to update participants')
      }
    } catch (error) {
      toast.error('Failed to update participants')
    } finally {
      setLoading(false)
    }
  }

  if (!match) return null

  // Filter participants by the same division and category as the match
  const divisionParticipants = participants.filter(p => {
    // If match has division_id and category_id, filter by them
    const matchAny = match as any
    if (matchAny.division_id && matchAny.category_id) {
      return p.division_id === matchAny.division_id && p.category_id === matchAny.category_id
    }
    // Otherwise show all participants
    return true
  })

  // Sort participants by name for easier finding
  const sortedParticipants = [...divisionParticipants].sort((a, b) => {
    const nameA = `${a.player.first_name} ${a.player.last_name}`
    const nameB = `${b.player.first_name} ${b.player.last_name}`
    return nameA.localeCompare(nameB)
  })

  const matchAny = match as any

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Match Participants</DialogTitle>
          {matchAny.tournament_divisions && matchAny.tournament_categories && (
            <p className="text-sm text-muted-foreground mt-1">
              {matchAny.tournament_divisions.name} - {matchAny.tournament_categories.name}
            </p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {divisionParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No participants found for this division.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Player 1</Label>
                <Select value={player1Id} onValueChange={setPlayer1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tbd">TBD / Empty</SelectItem>
                    {sortedParticipants.map((p) => (
                      <SelectItem key={p.player_id} value={p.player_id}>
                        {p.player.first_name} {p.player.last_name} ({p.team?.name || 'No Team'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Player 2</Label>
                <Select value={player2Id} onValueChange={setPlayer2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tbd">TBD / Empty</SelectItem>
                    {sortedParticipants.map((p) => (
                      <SelectItem key={p.player_id} value={p.player_id}>
                        {p.player.first_name} {p.player.last_name} ({p.team?.name || 'No Team'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
