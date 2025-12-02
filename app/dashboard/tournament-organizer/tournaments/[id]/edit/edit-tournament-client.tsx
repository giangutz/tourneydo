'use client'

import { TournamentForm } from '@/components/tournaments/tournament-form'
import { Tournament } from '@/types/models'

interface EditTournamentClientProps {
  tournament: Tournament
}

export function EditTournamentClient({ tournament }: EditTournamentClientProps) {
  return <TournamentForm tournament={tournament} />
}
