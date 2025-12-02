'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BracketView } from '@/components/tournaments/bracket-view'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { EditMatchDialog } from '@/components/tournaments/edit-match-dialog'
import { generateTournamentBracket } from '@/lib/actions/brackets'
import { Match, Tournament } from '@/types/models'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Trophy } from 'lucide-react'

interface BracketPageClientProps {
  tournament: Tournament
  participants: any[]
  matches: Match[]
}

export function BracketPageClient({ tournament, participants, matches }: BracketPageClientProps) {
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateTournamentBracket(tournament.id)
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success("Bracket generated successfully")
        router.refresh() // Refresh to show new matches
      }
    } catch (err) {
      toast.error("Failed to generate bracket")
    } finally {
      setGenerating(false)
    }
  }

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match)
    setDialogOpen(true)
  }

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [matchToEdit, setMatchToEdit] = useState<Match | null>(null)

  const handleEditMatch = (match: Match) => {
    setMatchToEdit(match)
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {matches.length > 0 ? 'Regenerate Bracket' : 'Generate Bracket'}
        </Button>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No bracket generated"
          description="Generate a bracket to start the tournament."
          action={{
            label: 'Generate Bracket',
            onClick: handleGenerate
          }}
        />
      ) : (
        <BracketView 
          matches={matches} 
          participants={participants} 
          onMatchClick={handleMatchClick}
          isOrganizer={true}
          onEditMatch={handleEditMatch}
          courts={tournament.courts || 0}
        />
      )}

      <MatchResultDialog 
        match={selectedMatch} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        participants={participants}
      />

      <EditMatchDialog
        match={matchToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        participants={participants}
        tournamentId={tournament.id}
      />
    </div>
  )
}
