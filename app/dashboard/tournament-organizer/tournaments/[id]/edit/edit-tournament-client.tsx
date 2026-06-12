'use client'

import { TournamentCreateWizard } from '@/components/tournaments/tournament-create-wizard'
import { Tournament } from '@/types/models'

interface EditTournamentClientProps {
  tournament: Tournament
  enabledDivisions: string[]
  availableDivisions: { name: string }[]
}

export function EditTournamentClient({ tournament, enabledDivisions }: EditTournamentClientProps) {
  return (
    <TournamentCreateWizard
      tournament={tournament}
      initialEnabledDivisions={enabledDivisions}
    />
  )
}
