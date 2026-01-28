"use client"

import { usePhase, DashboardPhase } from './phase-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar, Scale, Activity, Trophy } from 'lucide-react'

export function PhaseToggle() {
  const { currentPhase, setManualPhase, autoDetectedPhase, isManualOverride } = usePhase()

  const phases: { id: DashboardPhase; label: string; icon: React.ReactNode }[] = [
    { id: 'upcoming', label: 'Upcoming', icon: <Calendar className="h-4 w-4 mr-2" /> },
    { id: 'weigh-in', label: 'Weigh-In', icon: <Scale className="h-4 w-4 mr-2" /> },
    { id: 'ongoing', label: 'Ongoing', icon: <Activity className="h-4 w-4 mr-2" /> },
    { id: 'concluded', label: 'Concluded', icon: <Trophy className="h-4 w-4 mr-2" /> },
  ]

  return (
    <div className="flex flex-col space-y-2 w-full sm:w-auto">
      <div className="grid grid-cols-2 gap-1 sm:flex sm:space-x-1 sm:gap-0 bg-muted p-1 rounded-lg w-full sm:w-fit">
        {phases.map((phase) => (
          <Button
            key={phase.id}
            variant={currentPhase === phase.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setManualPhase(phase.id)}
            className={cn(
              "relative w-full sm:w-auto justify-start sm:justify-center px-3",
              currentPhase === phase.id && "shadow-sm"
            )}
          >
            {phase.icon}
            {phase.label}
            {autoDetectedPhase === phase.id && !isManualOverride && (
              <span className="ml-2 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            )}
          </Button>
        ))}
      </div>
      {isManualOverride && (
        <div className="text-xs text-muted-foreground flex items-center">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-medium mr-2">MANUAL VIEW</span>
          Viewing {currentPhase} phase. <Button variant="link" className="h-auto p-0 text-xs ml-1" onClick={() => setManualPhase(null)}>Reset to Auto ({autoDetectedPhase})</Button>
        </div>
      )}
    </div>
  )
}

