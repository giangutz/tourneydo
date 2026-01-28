"use client"

import { usePhase } from './phase-context'
import { PhaseToggle } from './phase-toggle'
import { UpcomingView } from './views/upcoming-view'
import { WeighInView } from './views/weigh-in-view'
import { OngoingView } from './views/ongoing-view'
import { ConcludedView } from './views/concluded-view'

interface DashboardContentProps {
  tournamentId: string
  userId: string
}

export function DashboardContent({ tournamentId, userId }: DashboardContentProps) {
  const { currentPhase } = usePhase()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold tracking-tight capitalize">{currentPhase} Phase</h2>
        <PhaseToggle />
      </div>

      <div className="min-h-[400px]">
        {currentPhase === 'upcoming' && <UpcomingView tournamentId={tournamentId} userId={userId} />}
        {currentPhase === 'weigh-in' && <WeighInView tournamentId={tournamentId} />} 
        {currentPhase === 'ongoing' && <OngoingView tournamentId={tournamentId} />}
        {currentPhase === 'concluded' && <ConcludedView tournamentId={tournamentId} />}
      </div>
    </div>
  )
}

