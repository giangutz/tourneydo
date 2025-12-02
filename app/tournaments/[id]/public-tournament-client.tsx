'use client'

import { useState } from 'react'
import { BracketView } from '@/components/tournaments/bracket-view'
import { MatchDetailsDialog } from '@/components/tournaments/match-details-dialog'
import { Match } from '@/types/models'

interface PublicTournamentClientProps {
  matches: Match[]
  participants: any[]
}

export function PublicTournamentClient({ matches, participants }: PublicTournamentClientProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match)
    setDialogOpen(true)
  }

  return (
    <>
      <BracketView 
        matches={matches} 
        participants={participants} 
        onMatchClick={handleMatchClick}
      />
      
      <MatchDetailsDialog 
        match={selectedMatch} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        participants={participants}
      />
    </>
  )
}
