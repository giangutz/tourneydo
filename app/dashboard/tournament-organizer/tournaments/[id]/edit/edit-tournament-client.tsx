'use client'

import { TournamentForm } from '@/components/tournaments/tournament-form'
import { Tournament } from '@/types/models'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface EditTournamentClientProps {
  tournament: Tournament
  enabledDivisions: string[]
  availableDivisions: { name: string }[]
}

export function EditTournamentClient({ tournament, enabledDivisions, availableDivisions }: EditTournamentClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Tournament</CardTitle>
        <CardDescription>
          Update the settings for {tournament.name}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TournamentForm 
          tournament={tournament} 
          initialEnabledDivisions={enabledDivisions}
          availableDivisions={availableDivisions} 
        />
      </CardContent>
    </Card>
  )
}
